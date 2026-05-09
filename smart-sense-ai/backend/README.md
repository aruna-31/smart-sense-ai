# smart-sense-ai backend

This folder contains a minimal FastAPI backend skeleton that exposes a `/api/chat` endpoint.

Quick start (dev):

1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` and `GEMINI_API_URL`.
2. Create a virtualenv and install requirements:

   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt

3. Run the dev server:

   uvicorn backend.app.main:app --reload --port 8000

The `/api/chat` endpoint expects a JSON body: `{ "prompt": "..." }` and returns `{ "text": "..." }`.

Billing:
- When a user exceeds the daily free limit, the rate limiter returns a 402 Payment Required with a JSON detail object that includes `amount`, `currency`, `interval`, and a `subscribe_url`.
- If `STRIPE_API_KEY` and `STRIPE_PRICE_ID` are configured the backend will create a Stripe Checkout session and return its URL; otherwise the backend provides a `mock-subscribe` endpoint for local testing.

Note: The provided limiter is an in-memory implementation for local development only. For production, replace it with a Redis-backed rate limiter or external service.
