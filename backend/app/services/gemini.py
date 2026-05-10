import os
import logging
import asyncio

try:
    from google import genai
    from google.genai import types
    _HAVE_GENAI = True
except Exception:
    _HAVE_GENAI = False

logger = logging.getLogger(__name__)


def _sync_generate_text(prompt: str, model: str | None = None, max_tokens: int = 1024) -> dict:
    """Call the Gemini API using the new google-genai SDK with v1beta endpoint.

    Using v1beta fixes 'User location is not supported' errors for AI Studio keys
    created from regions like India.
    """
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        logger.warning("GEMINI_API_KEY is not set")
        return {"text": "Error: GEMINI_API_KEY is not configured on the server.", "raw": {"dev": True}}

    if not _HAVE_GENAI:
        logger.warning("google-genai SDK is not installed")
        return {"text": "Error: google-genai SDK is not installed.", "raw": {"dev": True}}

    # Use gemini-1.5-flash by default — globally available including AI Studio keys from India.
    # gemini-2.x models are NOT available for AI Studio keys in restricted regions.
    model_name = model or os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    logger.info("Using Gemini model: %s", model_name)

    try:
        # Force v1beta endpoint — fixes regional restrictions on AI Studio API keys
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(api_version="v1beta"),
        )

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )

        text = response.text if hasattr(response, "text") else str(response)
        return {"text": text, "raw": str(response)}

    except Exception as exc:
        logger.exception("Gemini API call failed: %s", exc)
        return {"text": f"Gemini error: {exc}", "raw": {"error": str(exc)}}


async def generate_text(prompt: str, model: str | None = None, max_tokens: int = 1024) -> dict:
    return await asyncio.to_thread(_sync_generate_text, prompt, model, max_tokens)
