"""
main.py — Smart Sense AI FastAPI Backend

Local-only setup: No cloud, no API keys, no billing.
Talks to Ollama (localhost:11434) for all AI inference.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.generate import router as generate_router
from .routes.chat import router as chat_router

app = FastAPI(
    title="Smart Sense AI — Local Backend",
    description="FastAPI backend that serves AI features via local Ollama inference.",
    version="2.0.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Allow the Vite dev server (localhost:3000 / 5173) to call this backend.
# Why: Browsers block cross-origin requests by default. This tells the browser
#      "requests from these origins are allowed."
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "Smart Sense AI — Local Backend",
        "ollama": "http://localhost:11434",
        "docs": "http://localhost:8001/docs",
    }

# ── Routes ─────────────────────────────────────────────────────────────────────
app.include_router(generate_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
