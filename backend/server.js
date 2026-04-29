const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are a helpful, accurate, and neutral Election Assistant designed specifically for Indian elections.
Your primary job is to explain the election process, timelines, and concepts in simple, easy-to-understand language.
You should be able to explain concepts like "NOTA" (None of the Above), voter registration, EVMs (Electronic Voting Machines), VVPAT, and phases of voting.
Always use simple language. Be inclusive and helpful.
Do NOT show any political bias or endorse any party or candidate.
If a user asks a complex question, break the answer down into step-by-step instructions or bullet points.
Keep your answers concise and scannable.`
});




const axios = require('axios');

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, targetLanguage } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // ✅ Normalize history
        let formattedHistory = (history || []).map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        // ✅ Ensure first message is from user
        if (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
            formattedHistory = [];
        }

        const chat = model.startChat({
            history: formattedHistory,
        });

        const result = await chat.sendMessage(message);
        let responseText = await result.response.text();

        // Translate if a specific language is requested (and not English)
        if (targetLanguage && targetLanguage !== 'en' && process.env.GOOGLE_TRANSLATE_API_KEY && process.env.GOOGLE_TRANSLATE_API_KEY !== 'YOUR_TRANSLATE_API_KEY_HERE') {
            try {
                const translateResponse = await axios.post(
                    `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
                    {
                        q: responseText,
                        target: targetLanguage,
                        format: 'text' // Keep as text or 'html' based on your needs
                    }
                );
                
                if (translateResponse.data && translateResponse.data.data && translateResponse.data.data.translations) {
                     responseText = translateResponse.data.data.translations[0].translatedText;
                }
            } catch (translateError) {
                console.error("Translation error:", translateError.response ? translateError.response.data : translateError.message);
                // Fallback to English response if translation fails
            }
        }


        res.json({ text: responseText });

    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});



app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});