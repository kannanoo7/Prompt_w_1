const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');
const pino = require('pino');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./config');
const chatController = require('./controllers/chatController');

// Initialize logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

if (!process.env.GEMINI_API_KEY) {
  logger.error('FATAL: GEMINI_API_KEY environment variable is not set.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const defaultModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-pro',
  systemInstruction: config.SYSTEM_INSTRUCTION,
});

function createApp(options = {}) {
  const app = express();
  const aiModel = options.model || defaultModel;
  const translateFetch = options.fetch || fetch;

  // Efficiency & Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for simplicity in this demo, or configure properly
  }));
  app.use(compression());
  app.use(express.json({ limit: config.REQUEST_BODY_LIMIT }));

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    process.env.FRONTEND_ORIGIN,
  ].filter(Boolean);

  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.K_SERVICE && origin.includes('.run.app')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  };

  const chatLimiter = rateLimit({
    ...config.CHAT_LIMITER,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/chat', cors(corsOptions), chatLimiter, chatController.handleChat(aiModel, translateFetch));

  // Static file serving with caching
  const staticPath = path.join(__dirname, 'public');
  app.use(express.static(staticPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0');
      }
    },
  }));

  // Fallback for SPA
  app.use((req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  // Centralized Error Handler
  app.use((error, req, res, next) => {
    logger.error(error);

    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large.' });
    }

    if (error.message && error.message.includes('CORS policy')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: 'An unexpected error occurred.' });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  app.listen(config.PORT, () => {
    logger.info(`Backend server running on port ${config.PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
