# Smart Election Assistant

An interactive, accessible web application designed to help users understand the Indian election process, timelines, and key concepts. Powered by Google Gemini API.

## Features
- **Smart Assistant**: Ask questions like "What is NOTA?" or "How does EVM work?"
- **Timeline Generator**: View key election phases and sync dates directly to your Google Calendar.
- **Accessibility**: Toggle "Simple Language Mode" for easier reading, simplified text, and better contrast.

## Tech Stack
- **Frontend**: React + Vite + Vanilla CSS
- **Backend**: Node.js + Express (Proxy for Gemini API)
- **AI**: `@google/generative-ai` (Gemini 1.5 Flash)

## Setup Instructions

1. **Install Dependencies**
   Navigate to both `frontend` and `backend` folders and install dependencies:
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

2. **Environment Variables**
   The backend already has a `.env` file configured with the required `GEMINI_API_KEY`.

3. **Run the Application**
   Open two terminals:
   
   **Terminal 1 (Backend):**
   ```bash
   cd backend
   node server.js
   ```
   
   **Terminal 2 (Frontend):**
   ```bash
   cd frontend
   npm run dev
   ```

4. Open the browser link provided by Vite (usually `http://localhost:5173`).

## Testing Strategy
- The frontend includes basic structure for testing using Vitest (`frontend/src/App.test.jsx`).
- The backend includes basic structure for testing using Node's native test runner (`backend/server.test.js`).
- Run `node --test` in the backend folder to verify the runner.

## Repository Size
This project has been deliberately structured to use vanilla CSS and standard libraries to remain extremely lightweight (well under 10MB without `node_modules`).
