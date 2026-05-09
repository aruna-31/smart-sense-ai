import time
from typing import Dict
from fastapi import Request, HTTPException

# In-memory limiter (student-safe, demo/public-light usage)
# For production scale, replace with Redis.

REQUEST_LOG: Dict[str, Dict[str, list]] = {}

WINDOW_SECONDS = 60          # 1 minute window
MAX_REQUESTS_PER_MIN = 3     # VERY important for Gemini
MAX_REQUESTS_PER_DAY = 20    # Student-friendly daily quota


def _cleanup(times: list, window: int, now: float) -> list:
    return [t for t in times if now - t < window]


async def rate_limit(request: Request):
    """
    Rate limiter dependency:
    - 3 requests per minute
    - 20 requests per day
    """
    try:
        # Prefer user-id header if available, fallback to IP
        user_id = request.headers.get("X-User-ID")
        key = user_id or (request.client.host if request.client else "unknown")

        now = time.time()

        user_data = REQUEST_LOG.get(key, {
            "minute": [],
            "day": []
        })

        user_data["minute"] = _cleanup(user_data["minute"], WINDOW_SECONDS, now)
        user_data["day"] = _cleanup(user_data["day"], 86400, now)

        if len(user_data["minute"]) >= MAX_REQUESTS_PER_MIN:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded: max 3 requests per minute"
            )

        # Check subscription details to compute allowed daily requests
        try:
            from ..services.billing import get_subscription_details, create_checkout_session
            details = get_subscription_details(key)
            allowed_daily = MAX_REQUESTS_PER_DAY
            if details.get('status') == 'active':
                # bonus depends on plan
                plan = details.get('plan') or 'weekly'
                if plan == 'monthly':
                    allowed_daily += 20
                else:
                    allowed_daily += 3
            # still record usage but do not raise 402 for active users up to allowed_daily
        except Exception:
            allowed_daily = MAX_REQUESTS_PER_DAY

        if len(user_data["day"]) >= allowed_daily:
            # When daily free limit is exceeded, return a 402 Payment Required with billing info
            from ..services.billing import create_checkout_session

            weekly_url = create_checkout_session(key, plan='weekly')
            monthly_url = create_checkout_session(key, plan='monthly')
            raise HTTPException(
                status_code=402,
                detail={
                    "message": "Daily free limit reached. Subscribe to continue.",
                    "plans": [
                        {"plan": "weekly", "amount": 29, "currency": "INR", "interval": "week", "subscribe_url": weekly_url},
                        {"plan": "monthly", "amount": 99, "currency": "INR", "interval": "month", "subscribe_url": monthly_url},
                    ]
                },
            )

        user_data["minute"].append(now)
        user_data["day"].append(now)
        REQUEST_LOG[key] = user_data

        return True
    except HTTPException:
        # Propagate rate-limit HTTP exceptions (429) so clients get proper status
        raise
    except Exception as exc:
        # Log unexpected errors but do not block requests in dev
        import logging
        logging.getLogger(__name__).exception("Rate limiter failure - allowing request: %s", exc)
        return True
