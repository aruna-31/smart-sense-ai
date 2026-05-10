import os
import logging
import asyncio

try:
    from google import genai
    _HAVE_GENAI = True
except Exception:
    _HAVE_GENAI = False

logger = logging.getLogger(__name__)


def _sync_generate_text(prompt: str, model: str | None = None, max_tokens: int = 512) -> dict:
    """Call the Gemini API using the new google-genai SDK.

    Falls back to a canned response when the API or credentials are missing.
    """
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        logger.warning("GEMINI_API_KEY is not set; returning dev fallback response")
        return {"text": "(error) GEMINI_API_KEY is not configured on the server.", "raw": {"dev": True}}

    if not _HAVE_GENAI:
        logger.warning("google-genai SDK is not installed; returning dev fallback response")
        return {"text": "(error) google-genai SDK is not installed.", "raw": {"dev": True}}

    model_name = model or os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    logger.info("Using Gemini model %s", model_name)

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        text = response.text if hasattr(response, "text") else str(response)
        return {"text": text, "raw": str(response)}

    except Exception as exc:
        logger.exception("Gemini API call failed: %s", exc)
        return {"text": f"Gemini error: {exc}", "raw": {"error": str(exc)}}


async def generate_text(prompt: str, model: str | None = None, max_tokens: int = 512) -> dict:
    return await asyncio.to_thread(_sync_generate_text, prompt, model, max_tokens)
