import os
import logging
import asyncio
import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://generativelanguage.googleapis.com"

# All models use v1beta — that's the endpoint where the key is registered
_MODELS_TO_TRY = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
]


def _call_gemini(api_key: str, model: str, prompt: str) -> str:
    url = f"{BASE_URL}/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.8},
    }
    resp = httpx.post(
        url,
        params={"key": api_key},
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=30.0,
    )
    resp.raise_for_status()
    data = resp.json()
    return (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )


def _sync_generate_text(prompt: str, model: str | None = None, max_tokens: int = 1024) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"text": "Error: GEMINI_API_KEY is not set.", "raw": {}}

    preferred = model or os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    models = [preferred] + [m for m in _MODELS_TO_TRY if m != preferred]

    last_error = None
    for model_name in models:
        try:
            logger.info("Trying v1beta/%s", model_name)
            text = _call_gemini(api_key, model_name, prompt)
            if text:
                logger.info("Success: v1beta/%s", model_name)
                return {"text": text, "raw": {}}
        except httpx.HTTPStatusError as exc:
            logger.warning("v1beta/%s → HTTP %s", model_name, exc.response.status_code)
            last_error = exc
        except Exception as exc:
            logger.warning("v1beta/%s → %s", model_name, exc)
            last_error = exc

    return {"text": f"All models failed. Last error: {last_error}", "raw": {"error": str(last_error)}}


async def generate_text(prompt: str, model: str | None = None, max_tokens: int = 1024) -> dict:
    return await asyncio.to_thread(_sync_generate_text, prompt, model, max_tokens)
