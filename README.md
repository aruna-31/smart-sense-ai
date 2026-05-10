# Smart Sense AI 🤖

A full-stack AI-powered productivity platform — **fully local, zero cloud, zero API costs**.

Built with React + FastAPI + Ollama (local LLM inference).

---

## Features

| Feature | Description |
|---|---|
| 🎭 SMART Excuse Generator | Generate believable, funny, urgent or professional excuses |
| 🙏 Apology Generator | Craft heartfelt apologies with tone control |
| 📧 Email & Letter Writer | Professional email/letter generation |
| 📚 Learning Hub | AI-generated learning roadmaps for any topic |
| 🏥 Medical Generator | Patient-friendly or student-focused medical info |
| 🌐 Voice Translator | Translate text + browser text-to-speech |
| 💬 AI Chatbot | Conversational assistant powered by local LLM |

---

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS
- **Backend**: FastAPI (Python)
- **AI**: [Ollama](https://ollama.com) — local LLM inference
- **Model**: Mistral 7B (recommended) or Llama 3.2 3B (low RAM)

---

## Setup (First Time)

### Step 1 — Install Ollama

Download from: https://ollama.com/download

After installing, open a terminal and run:
```bash
ollama serve
```

### Step 2 — Pull the AI Model

In a new terminal:
```bash
ollama pull mistral
```
> If you have less than 6GB RAM available, use: `ollama pull phi3:mini` (lighter)

### Step 3 — Start the Backend

Double-click `start_backend.bat` OR run:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Backend will be at: http://localhost:8001  
API docs: http://localhost:8001/docs

### Step 4 — Start the Frontend

Double-click `start_frontend.bat` OR run:
```bash
npm install
npm run dev
```

Frontend will be at: http://localhost:3000

---

## Running (After First Setup)

Open 3 terminals:

| Terminal | Command |
|---|---|
| 1 | `ollama serve` |
| 2 | `start_backend.bat` |
| 3 | `start_frontend.bat` |

Then open http://localhost:3000 in your browser.

---

## Architecture

```
Browser (localhost:3000)
  └── React Frontend
        └── /api/* calls
              └── FastAPI Backend (localhost:8001)
                    └── HTTP POST
                          └── Ollama (localhost:11434)
                                └── mistral:7b model
```

100% local. No internet required after setup.

---

## Model Options

| Model | Pull Command | RAM Usage | Quality |
|---|---|---|---|
| mistral (recommended) | `ollama pull mistral` | ~4GB | ⭐⭐⭐⭐⭐ |
| llama3.2 | `ollama pull llama3.2` | ~2GB | ⭐⭐⭐ |
| phi3:mini | `ollama pull phi3:mini` | ~2.3GB | ⭐⭐⭐⭐ |

---

## Project Structure

```
smart-sense-ai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS
│   │   ├── routes/
│   │   │   ├── generate.py      # /api/generate — all AI features
│   │   │   └── chat.py          # /api/chat — chatbot
│   │   └── services/
│   │       └── ollama.py        # Ollama HTTP client
│   └── requirements.txt
├── components/                  # React UI components
├── services/
│   └── aiService.ts             # Frontend API service layer
├── start_backend.bat
├── start_frontend.bat
└── README.md
```
