"""
ollama.py — Smart Sense AI local inference client

Why: Ollama runs a local HTTP server at localhost:11434 that serves LLM models.
     We call it directly using httpx (no SDK needed, just plain HTTP).
     This replaces the cloud Gemini API with zero cost, zero API keys, fully offline.
"""

import httpx
import logging
import asyncio

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"

# Model to use — mistral gives the best quality/speed balance on 8GB RAM
DEFAULT_MODEL = "mistral"

# Fallback models tried in order if the default is not pulled
FALLBACK_MODELS = ["mistral", "llama3.2", "phi3", "phi3:mini"]


def _check_ollama_running() -> bool:
    """Verify that the Ollama server is up."""
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3.0)
        return r.status_code == 200
    except Exception:
        return False


def _get_available_model() -> str | None:
    """Return the first model from FALLBACK_MODELS that is already pulled locally."""
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
        pulled = {m["name"].split(":")[0] for m in r.json().get("models", [])}
        for model in FALLBACK_MODELS:
            base = model.split(":")[0]
            if base in pulled:
                logger.info("Using local model: %s", model)
                return model
    except Exception as exc:
        logger.warning("Could not fetch Ollama model list: %s", exc)
    return None


def generate(prompt: str, model: str | None = None, temperature: float = 0.8, max_tokens: int = 1024) -> str:
    """
    Send a prompt to Ollama and return the text response.

    Why synchronous: called inside asyncio.to_thread() so it doesn't block the FastAPI event loop.
    """
    if not _check_ollama_running():
        return (
            "❌ Ollama is not running. "
            "Please start it with: ollama serve\n"
            "Then pull a model: ollama pull mistral"
        )

    # Resolve model: use arg → default → first available local model
    selected_model = model or DEFAULT_MODEL
    available = _get_available_model()
    if available and selected_model not in (available, DEFAULT_MODEL):
        selected_model = available
    elif available:
        selected_model = available

    if not available:
        return (
            f"❌ No models found. Run: ollama pull mistral\n"
            f"Then restart the backend."
        )

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": selected_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                },
            },
            timeout=120.0,  # LLMs can be slow on CPU — allow up to 2 minutes
        )
        response.raise_for_status()
        return response.json().get("response", "").strip()

    except httpx.TimeoutException:
        return "⏳ The model took too long to respond. Try a shorter prompt or switch to phi3:mini."
    except httpx.HTTPStatusError as exc:
        logger.error("Ollama HTTP error: %s", exc)
        return f"❌ Ollama error {exc.response.status_code}: {exc.response.text[:200]}"
    except Exception as exc:
        logger.exception("Unexpected Ollama error")
        return f"❌ Unexpected error: {exc}"


async def generate_async(prompt: str, model: str | None = None, temperature: float = 0.8, max_tokens: int = 1024) -> str:
    """
    Async wrapper around generate().
    Why: FastAPI is async, but httpx blocking calls must run in a thread pool.
    asyncio.to_thread() offloads the blocking call without freezing the server.
    """
    return await asyncio.to_thread(generate, prompt, model, temperature, max_tokens)
