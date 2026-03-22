# 🧠 BrainBuddy — ELI5 Engineering Chatbot

Explains any engineering concept like you're 5 years old.
Built with FastAPI + React + Groq (Llama 3).

**Live demo**: https://your-app.vercel.app

---

## ✨ Features

- 💡 ELI5 explanations with real-world analogies
- 📊 Markdown tables for comparisons (e.g. "compare Hadoop vs Spark")
- 🎙️ Speech-to-text input (Chrome/Edge)
- 🔊 Read aloud with Web Speech API
- 🎥 Video generation via D-ID (optional)
- 🌙 Day / Night theme toggle
- 💾 Chat history saved in SQLite

---

## 🚀 Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR-USERNAME/brainbuddy.git
cd brainbuddy
```

### 2. Backend

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
uvicorn main:app --reload
```

### 3. Frontend

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## 🌐 Deploy for Free

### Backend → Render

1. Go to https://render.com → New Web Service → connect GitHub repo
2. Set Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Add environment variables:
   - `GROQ_API_KEY` = your Groq key
   - `FRONTEND_URL` = your Vercel URL (add after deploying frontend)

### Frontend → Vercel

1. Go to https://vercel.com → Import GitHub repo
2. Framework: Vite | Output: dist
3. Add environment variable:
   - `VITE_API_URL` = your Render URL (e.g. https://brainbuddy.onrender.com)

---

## 🔑 Environment Variables

| Variable       | Where    | Description                      |
| -------------- | -------- | -------------------------------- |
| `GROQ_API_KEY` | Backend  | Free at console.groq.com         |
| `FRONTEND_URL` | Backend  | Your Vercel URL (for CORS)       |
| `VITE_API_URL` | Frontend | Your Render URL                  |
| `DID_API_KEY`  | Backend  | Optional — D-ID video generation |

---

## 🗂️ Project Structure

```
brainbuddy/
├── main.py           ← FastAPI app
├── database.py       ← SQLAlchemy setup
├── models.py         ← DB table definitions
├── schemas.py        ← Pydantic models
├── video.py          ← D-ID integration
├── Procfile          ← Render start command
├── requirements.txt
├── .env.example
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── App.jsx
    ├── api.js
    ├── index.css
    └── components/
        ├── Header.jsx
        ├── Sidebar.jsx
        ├── WelcomeScreen.jsx
        ├── ChatInput.jsx
        ├── UserBubble.jsx
        ├── ThinkingIndicator.jsx
        ├── ResponseCard.jsx
        ├── ErrorMessage.jsx
        ├── VideoPlayer.jsx
        └── MarkdownRenderer.jsx
```
