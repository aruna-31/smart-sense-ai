## Run Locally
**Prerequisites:**  Node.js
1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
🚀 Smart Sense AI — Intelligent Communication Assistant

Smart Sense AI is an advanced AI-powered communication assistant designed to help students and professionals generate excuses, apologies, professional emails, letters, medical explanations, and personalized learning roadmaps.
Built with React + FastAPI + Gemini 1.5 Pro, the system delivers fast, context-aware, human-like responses with customizable tones.

🌟 Key Features
📝 Communication Generators

Excuse Generator — believable, funny, urgent, or professional excuses
Apology Generator — emotionally aware, sincere apologies
Email Assistant — properly formatted academic & professional emails
Letter Writer — formal & informal letters with correct structure
🎧 Voice Translation
Real-time speech-to-text translation
Supports multiple languages
Ideal for global communication
🎓 Learning Hub
Personalized learning roadmap generator
Skill-based suggestions tailored to user progress
Helps students plan studies & projects effectively
🏥 Medical Information Generator
Simplified explanations of medical terms & conditions

Helps increase health awareness using easy language

🧠 Technology Stack
Frontend
React.js + TypeScript
TailwindCSS
Framer Motion animations
>>>Backend
FastAPI (Python)
Async request handling
REST API integration
>>>AI Engine:
Google Gemini 1.5 Pro
Advanced prompt engineering
Tone-controlled output generation
Deployment:
GitHub CI/CD

🏗️ System Architecture

1️⃣ User Input — user enters text or uses voice
2️⃣ Frontend Processing — React interface prepares request
3️⃣ API Gateway — FastAPI routes and validates request
4️⃣ AI Processing — Gemini 1.5 Pro generates best response
5️⃣ Output Display — result shown in a clean, modern UI

💻 Project Structure
smart-sense-ai/
│
├── src/
│   ├── components/
│   │   ├── ExcuseGenerator.tsx
│   │   ├── ApologyGenerator.tsx
│   │   ├── EmailAssistant.tsx
│   │   ├── LearningHub.tsx
│   │   └── VoiceTranslator.tsx
│   ├── services/
│   │   └── geminiService.ts
│   ├── hooks/
│   │   └── useSpeechRecognition.ts
│   ├── App.tsx
│   └── index.tsx
│
├── public/
├── package.json
├── README.md
└── .env

🚀 Future Enhancements

✨ Emotion detection

✉️ Direct Gmail integration

📚 Meeting intelligence (real-time summaries)

🌍 More languages and voice models

🎨 Themes & personalization
