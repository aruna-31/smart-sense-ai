import os
import logging
import asyncio
import httpx

logger = logging.getLogger(__name__)

# Models to try in order — tries v1beta first (newer), then v1 (stable)
_MODELS_TO_TRY = [
    ("v1beta", "gemini-2.0-flash"),
    ("v1beta", "gemini-2.0-flash-exp"),
    ("v1",     "gemini-1.5-flash"),
    ("v1",     "gemini-1.5-flash-latest"),
    ("v1",     "gemini-pro"),
]

BASE_URL = "https://generativelanguage.googleapis.com"


def _call_gemini_rest(api_key: str, api_version: str, model: str, prompt: str) -> dict:
    """Make a direct REST call to the Gemini API — bypasses all SDK routing issues."""
    url = f"{BASE_URL}/{api_version}/models/{model}:generateContent"
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "maxOutputTokens": 1024,
            "temperature": 0.8,
        }
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
    # Extract text from Gemini REST response shape
    text = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    return {"text": text, "raw": data}


def _sync_generate_text(prompt: str, model: str | None = None, max_tokens: int = 1024) -> dict:
    """Try each (api_version, model) combo until one works."""
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        logger.warning("GEMINI_API_KEY is not set")
        return {"text": "Error: GEMINI_API_KEY is not configured on the server.", "raw": {}}

    # Build attempt list — honour env override / caller preference first
    preferred_model = model or os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    # Find which api_version goes with the preferred model, default to v1beta
    preferred_version = next(
        (ver for ver, m in _MODELS_TO_TRY if m == preferred_model), "v1beta"
    )
    attempts = [(preferred_version, preferred_model)] + [
        (ver, m) for ver, m in _MODELS_TO_TRY if m != preferred_model
    ]

    last_error = None
    for api_version, model_name in attempts:
        try:
            logger.info("Trying %s/%s", api_version, model_name)
            result = _call_gemini_rest(api_key, api_version, model_name, prompt)
            if result.get("text"):
                logger.info("Success with %s/%s", api_version, model_name)
                return result
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            logger.warning("%s/%s → HTTP %s: %s", api_version, model_name, status, exc.response.text[:200])
            last_error = exc
            if status in (400, 403):
                # Key / permission issue — no point retrying same key with other models
                break
            continue
        except Exception as exc:
            logger.warning("%s/%s → %s", api_version, model_name, exc)
            last_error = exc
            continue

    return {
        "text": f"Gemini error: {last_error}. Please check your GEMINI_API_KEY and try again.",
        "raw": {"error": str(last_error)},
    }


async def generate_text(prompt: str, model: str | None = None, max_tokens: int = 1024) -> dict:
    return await asyncio.to_thread(_sync_generate_text, prompt, model, max_tokens)
