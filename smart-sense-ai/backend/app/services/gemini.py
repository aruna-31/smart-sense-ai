import os
import logging
import asyncio

try:
    import google.generativeai as genai
    _HAVE_GENAI = True
except Exception:
    _HAVE_GENAI = False

logger = logging.getLogger(__name__)


def _sync_generate_text(prompt: str, model: str | None = None, max_tokens: int = 512) -> dict:
    """Synchronous implementation that calls the Google Generative API when available.

    Falls back to a simple canned response when the API or credentials are missing or raise an error.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not _HAVE_GENAI:
        logger.warning("Gemini not configured or SDK unavailable; returning dev fallback response")
        return {"text": f"(dev) Gemini not configured — echo: {prompt}", "raw": {"dev": True}}

    genai.configure(api_key=api_key)

    model_name = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    logger.info("Using Gemini model %s", model_name)
    try:
        m = genai.GenerativeModel(model_name)
        response = m.generate_content(prompt)
        # Avoid returning SDK objects directly (not json-serializable). Convert to string summary.
        return {"text": getattr(response, 'text', str(response)), "raw": str(response)}
    except Exception as exc:
        # Try to gather available models to help debugging when a model is not found
        logger.exception("Gemini API call failed")
        available = []
        try:
            if hasattr(genai, 'list_models'):
                # some SDKs provide a list_models helper
                available = [m.name for m in genai.list_models()]
        except Exception:
            # ignore model-listing errors
            available = []

        hint = ""
        if available:
            hint = f" Available models: {', '.join(available)}."

        return {"text": f"(dev fallback) Gemini error: {exc}.{hint}", "raw": {"error": str(exc), "available_models": available}}


async def generate_text(prompt: str, model: str | None = None, max_tokens: int = 512) -> dict:
    return await asyncio.to_thread(_sync_generate_text, prompt, model, max_tokens)
