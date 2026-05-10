"""
routes/chat.py — Chatbot endpoint

Why: Stateless chat — we send the last N messages as context each time.
     No session storage needed for a demo. Works perfectly for portfolio showcases.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from ..services.ollama import generate_async

router = APIRouter()


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    text: str


class ChatRequest(BaseModel):
    prompt: str
    history: Optional[List[ChatMessage]] = []
    model: Optional[str] = None


@router.post("/chat")
async def chat(req: ChatRequest):
    """
    Stateless chat endpoint.
    We build a conversational prompt from history + new message.
    No DB storage — simple and fast for demo purposes.
    """
    # Build context from recent history (last 6 turns to keep prompt short)
    context = ""
    for msg in (req.history or [])[-6:]:
        role_label = "User" if msg.role == "user" else "Assistant"
        context += f"{role_label}: {msg.text}\n"

    system_prompt = (
        "You are SmartSense AI, a friendly and helpful AI assistant. "
        "Be concise, clear, and conversational. "
        "Answer helpfully in 2-4 sentences unless more detail is clearly needed.\n\n"
    )

    full_prompt = system_prompt + context + f"User: {req.prompt}\nAssistant:"

    text = await generate_async(full_prompt, model=req.model, temperature=0.7, max_tokens=512)
    return {"text": text}
