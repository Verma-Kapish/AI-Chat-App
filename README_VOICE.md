# Voice Assistant Setup Guide

## Features
- 🎤 **Simple Button Activation** - Click the microphone button in the header
- 👶 **Cute Kid Voice** - Friendly child-like voice greeting
- 🇮🇳 **English India Recognition** - Optimized for Indian English accent
- 💬 **Voice Conversations** - Ask questions and get voice responses
- 💾 **Database Storage** - All interactions saved locally and to backend

## How to Use

### 1. Frontend Only (No Backend)
The app works immediately with localStorage. Just:
1. Open `intellichat-final.html` in your browser
2. Click the microphone button (🎤) in the header
3. A popup appears with cute kid voice saying "How can I help you today?"
4. Speak your question
5. Get voice response!

### 2. With Backend (Optional)

#### Install Dependencies
```bash
npm install
```

#### Start Server
```bash
npm start
```
or
```bash
node server.js
```

Server runs on `http://localhost:3000`

#### Access the App
Open `http://localhost:3000/intellichat-final.html` in your browser

## Backend API

### Save Voice Interaction
```
POST /api/voice-interactions
Body: {
  "question": "Your question",
  "answer": "AI response",
  "user": "user@email.com"
}
```

### Get Voice Interactions
```
GET /api/voice-interactions?user=user@email.com
```

## Database

- **LocalStorage**: Works immediately, no setup needed
- **Backend**: Saves to `voice_interactions.json` file (created automatically)

## Browser Support

- ✅ Chrome/Edge (Full support)
- ✅ Safari (Partial support)
- ⚠️ Firefox (Limited support)

## Notes

- First time: Browser will ask for microphone permission
- Language: Set to English India (en-IN) for better recognition
- Voice: Automatically selects cute kid-friendly voice if available

