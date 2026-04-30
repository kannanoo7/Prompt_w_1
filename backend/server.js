const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Startup environment validation ──────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY environment variable is not set.');
  process.exit(1);
}

const app = express();

// ── Security: CORS whitelist ─────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000',
  'http://localhost:5000',
  process.env.FRONTEND_ORIGIN, // production URL from env
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// ── Security: Request size limit ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── Security: Rate limiting ──────────────────────────────────────────────────
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const PORT = process.env.PORT || 5000;

// ── AI Model initialization ──────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-pro',
  systemInstruction: `You are a helpful, accurate, and neutral Election Assistant designed specifically for Indian elections.
Your primary job is to explain the election process, timelines, and concepts in simple, easy-to-understand language.
You should be able to explain concepts like "NOTA" (None of the Above), voter registration, EVMs (Electronic Voting Machines), VVPAT, and phases of voting.
Always use simple language. Be inclusive and helpful.
Do NOT show any political bias or endorse any party or candidate.
If a user asks a complex question, break the answer down into step-by-step instructions or bullet points.
Keep your answers concise and scannable.`,
});

// ── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { message, history, targetLanguage } = req.body;

    // Input validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string.' });
    }
    if (message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message is too long. Maximum 2000 characters.' });
    }

    // Normalize and trim history to the last 10 messages to limit token usage
    const rawHistory = Array.isArray(history) ? history : [];
    let formattedHistory = rawHistory
      .slice(-10)
      .map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(msg.parts?.[0]?.text ?? '') }],
      }));

    // Ensure history starts with a user message (Gemini API requirement)
    if (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
      formattedHistory = [];
    }

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(message.trim());
    let responseText = await result.response.text();

    // Translate if a specific language is requested (and not English)
    const translateKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (
      targetLanguage &&
      targetLanguage !== 'en' &&
      translateKey &&
      translateKey !== 'YOUR_TRANSLATE_API_KEY_HERE'
    ) {
      try {
        const translateResponse = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=${translateKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: responseText, target: targetLanguage, format: 'text' }),
          }
        );
        const translateData = await translateResponse.json();
        if (translateData?.data?.translations?.[0]?.translatedText) {
          responseText = translateData.data.translations[0].translatedText;
        }
      } catch (translateError) {
        console.error('Translation error:', translateError.message);
        // Fallback to English response if translation fails
      }
    }

    res.json({ text: responseText });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Failed to process chat request.' });
  }
});

// ── Static files (production build) ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// Fallback all non-API routes to the React app
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

module.exports = app; // Export for testing