import os
import logging
import asyncio

try:
    from google import genai
    _HAVE_GENAI = True
except Exception:
    _HAVE_GENAI = False

logger = logging.getLogger(__name__)

# Models to try in order — first one that works will be used
_FALLBACK_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001",
]


def _sync_generate_text(prompt: str, model: str | None = None, max_tokens: int = 1024) -> dict:
    """Call Gemini API. Auto-selects the best available model if the default fails."""
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        logger.warning("GEMINI_API_KEY is not set")
        return {"text": "Error: GEMINI_API_KEY is not configured on the server.", "raw": {"dev": True}}

    if not _HAVE_GENAI:
        logger.warning("google-genai SDK not installed")
        return {"text": "Error: google-genai SDK not installed.", "raw": {"dev": True}}

    # Build the list of models to attempt
    env_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    preferred = model or env_model
    models_to_try = [preferred] + [m for m in _FALLBACK_MODELS if m != preferred]

    # Use default client — no explicit api_version, SDK routes correctly per model
    client = genai.Client(api_key=api_key)

    last_error = None
    for model_name in models_to_try:
        try:
            logger.info("Trying Gemini model: %s", model_name)
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            text = response.text if hasattr(response, "text") else str(response)
            logger.info("Success with model: %s", model_name)
            return {"text": text, "raw": str(response)}
        except Exception as exc:
            logger.warning("Model %s failed: %s", model_name, exc)
            last_error = exc
            continue  # try next model

    # All models failed
    logger.exception("All Gemini models failed. Last error: %s", last_error)
    return {
        "text": f"Gemini error (all models tried): {last_error}",
        "raw": {"error": str(last_error)},
    }


async def generate_text(prompt: str, model: str | None = None, max_tokens: int = 1024) -> dict:
    return await asyncio.to_thread(_sync_generate_text, prompt, model, max_tokens)
