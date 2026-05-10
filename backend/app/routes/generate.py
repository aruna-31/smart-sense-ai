"""
routes/generate.py — All AI generation endpoints

Why: A single /api/generate endpoint handles all feature prompts.
     The frontend sends a feature name + user input; we build a quality prompt here.
     Keeping prompt templates server-side means the frontend stays thin and clean.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ..services.ollama import generate_async

router = APIRouter()


# ── Request schema ─────────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    feature: Optional[str] = None     # e.g. "excuse", "apology", "email", "learn", "medical", "translate"
    prompt: Optional[str] = None      # raw prompt (fallback if feature not matched)
    situation: Optional[str] = None   # for excuse/apology
    mode: Optional[str] = None        # tone/mode e.g. "Believable", "Funny"
    topic: Optional[str] = None       # for learning
    condition: Optional[str] = None   # for medical
    audience: Optional[str] = None    # for medical: "Patient" or "Student"
    text: Optional[str] = None        # for translation/summarization
    from_lang: Optional[str] = None
    to_lang: Optional[str] = None
    to: Optional[str] = None          # email recipient
    subject: Optional[str] = None
    points: Optional[str] = None
    tone: Optional[str] = None
    model: Optional[str] = None       # override model


def build_prompt(req: GenerateRequest) -> str:
    """
    Why: Good prompts = good output. Instead of letting the frontend craft prompts,
    we build structured, context-rich prompts here for consistently better results.
    """
    feature = (req.feature or "").lower()

    if feature == "excuse":
        mode = req.mode or "believable"
        situation = req.situation or req.prompt or ""
        return (
            f"Generate a {mode.lower()} excuse for this situation: \"{situation}\".\n"
            f"Make it creative and concise (2-3 sentences).\n"
            f"End with: Believability: X% and one fitting emoji."
        )

    if feature == "apology":
        tone = req.mode or req.tone or "sincere"
        situation = req.situation or req.prompt or ""
        return (
            f"Write a {tone.lower()} apology for: \"{situation}\".\n"
            f"Make it heartfelt and concise (2-4 sentences).\n"
            f"End with: Sincerity: X% and one fitting emoji."
        )

    if feature == "email":
        return (
            f"Write a professional {(req.tone or 'formal').lower()} email.\n"
            f"To: {req.to or 'the recipient'}\n"
            f"Subject: {req.subject or 'the matter'}\n"
            f"Key points: {req.points or req.prompt or ''}\n"
            f"Write only the email body. No subject line. Keep it clear and concise."
        )

    if feature == "letter":
        return (
            f"Write a {(req.tone or 'formal').lower()} letter.\n"
            f"To: {req.to or 'the recipient'}\n"
            f"Key points: {req.points or req.prompt or ''}\n"
            f"Write only the letter body. Keep it professional and clear."
        )

    if feature == "learn":
        topic = req.topic or req.prompt or ""
        return (
            f"Create a clear, beginner-friendly learning roadmap for: \"{topic}\".\n"
            f"Structure it as: Overview → Key Concepts → Step-by-step learning path → Practice projects.\n"
            f"Format as clean markdown with headers. Keep it practical and motivating."
        )

    if feature == "medical":
        condition = req.condition or req.prompt or ""
        audience = (req.audience or "Patient").strip().lower()
        if audience == "student":
            return (
                f"Create a SAMPLE educational medical note/template for a student leave due to: '{condition}'.\n"
                f"Clearly label as: 'SAMPLE — For educational use only — Not a real medical record.'\n"
                f"Include: Student name (placeholder), Date (placeholder), Reason, Rest duration.\n"
                f"Keep it professional and concise."
            )
        return (
            f"Provide patient-friendly home care information for: '{condition}'.\n"
            f"Cover: What is it (simple terms), Common symptoms, Home care tips, Warning signs to see a doctor.\n"
            f"End with: 'This is general information only — not medical advice. Consult a healthcare professional for personal concerns.'"
        )

    if feature == "translate":
        return (
            f"Translate the following text from {req.from_lang or 'the source language'} "
            f"to {req.to_lang or 'English'}:\n\n\"{req.text or req.prompt or ''}\"\n\n"
            f"Provide only the translation, no explanations."
        )

    if feature == "summarize":
        return (
            f"Summarize the following text concisely:\n\n\"{req.text or req.prompt or ''}\"\n\n"
            f"Provide a clear, accurate summary in 3-5 sentences."
        )

    # Fallback: use raw prompt
    return req.prompt or "Hello! Please say something helpful."


# ── Route ──────────────────────────────────────────────────────────────────────
@router.post("/generate")
async def generate(req: GenerateRequest):
    """
    Single endpoint for all AI generation features.
    Why single endpoint: simpler frontend, easier to maintain, one place to update prompts.
    """
    prompt = build_prompt(req)
    text = await generate_async(prompt, model=req.model)
    return {"text": text}
