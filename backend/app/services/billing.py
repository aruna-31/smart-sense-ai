import os
import stripe
import logging
from typing import Optional

logger = logging.getLogger(__name__)

STRIPE_API_KEY = os.getenv("STRIPE_API_KEY")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID")  # Price ID for the weekly INR 9 plan
STRIPE_SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "http://localhost:3000/")
STRIPE_CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", "http://localhost:3000/")

# Fallback in-memory subscription store for dev (used only if DB is not available)
SUBSCRIPTIONS = {}

# Replace in-memory subscriptions with DB-backed logic when available
try:
    from ..db import get_session
    from ..models import Subscription
    from sqlmodel import select
    DB_AVAILABLE = True
except Exception:
    DB_AVAILABLE = False

if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY


def create_checkout_session(user_id: str, amount_inr: int = 29, plan: str = 'weekly') -> Optional[str]:
    """Create a Stripe Checkout Session for a plan. Returns a URL or None if Stripe not configured.
    plan: 'weekly' (29 INR) or 'monthly' (99 INR)
    """
    # Map plan to price (dev fallback)
    if plan == 'monthly':
        amount_inr = 99
    else:
        amount_inr = 29
    if not STRIPE_API_KEY or not STRIPE_PRICE_ID:
        # fallback: return an internal subscribe URL the frontend can call to simulate activation
        # Persist a pending subscription in DB if possible
        if DB_AVAILABLE:
            sess = next(get_session())
            stmt = select(Subscription).where(Subscription.user_id == user_id)
            sub = sess.exec(stmt).first()
            if not sub:
                s = Subscription(user_id=user_id, active=False, stripe_session_id=None, plan=plan)
                sess.add(s)
                sess.commit()
        # include plan in mock subscribe url so dev flow can activate correct plan
        return f"/api/billing/mock-subscribe?user_id={user_id}&plan={plan}"

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            success_url=STRIPE_SUCCESS_URL + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=STRIPE_CANCEL_URL,
            metadata={"user_id": user_id},
        )
        # Persist pending subscription if DB available
        if DB_AVAILABLE:
            sess = next(get_session())
            s = Subscription(user_id=user_id, active=False, stripe_session_id=session.id)
            sess.add(s)
            sess.commit()
        return session.url
    except Exception as exc:
        logger.exception("Stripe session creation failed")
        # fallback to internal mock link
        if DB_AVAILABLE:
            sess = next(get_session())
            s = Subscription(user_id=user_id, active=False, stripe_session_id=None)
            sess.add(s)
            sess.commit()
        return f"/api/billing/mock-subscribe?user_id={user_id}"


def activate_subscription_for_user(user_id: str, plan: str = 'weekly'):
    """Dev helper to mark subscription active. In real world you'd use webhook verification.
    plan: 'weekly' or 'monthly'
    """
    if DB_AVAILABLE:
        sess = next(get_session())
        stmt = select(Subscription).where(Subscription.user_id == user_id)
        sub = sess.exec(stmt).first()
        if sub:
            sub.active = True
            sub.plan = plan
            from datetime import datetime, timedelta
            sub.start_at = datetime.utcnow()
            if plan == 'monthly':
                sub.end_at = datetime.utcnow() + timedelta(days=30)
            else:
                sub.end_at = datetime.utcnow() + timedelta(days=7)
            sess.add(sub)
            sess.commit()
            return {"status": "active", "user_id": user_id, "plan": plan}
        else:
            new = Subscription(user_id=user_id, active=True, plan=plan)
            from datetime import datetime, timedelta
            new.start_at = datetime.utcnow()
            if plan == 'monthly':
                new.end_at = datetime.utcnow() + timedelta(days=30)
            else:
                new.end_at = datetime.utcnow() + timedelta(days=7)
            sess.add(new)
            sess.commit()
            return {"status": "active", "user_id": user_id, "plan": plan}

    return {"status": "active", "user_id": user_id, "plan": plan}


def submit_payment_request(user_id: str, plan: str, utr: str):
    """Submit a payment UTR for manual verification. Sets status to pending."""
    if DB_AVAILABLE:
        sess = next(get_session())
        stmt = select(Subscription).where(Subscription.user_id == user_id)
        sub = sess.exec(stmt).first()
        
        if sub:
            sub.plan = plan
            sub.utr = utr
            sub.payment_status = 'pending'
            # If they were active but now submitting new payment, maybe keep active? 
            # Or if expired, they are inactive. 
            # For simplicity, if they submit a new payment, let's not deactivate immediately if they have time left?
            # But the user is likely doing this to ACTIVATE.
            # Let's assume this is for a new term.
            sub.active = False # Require re-verification
            sess.add(sub)
            sess.commit()
        else:
            new = Subscription(user_id=user_id, active=False, plan=plan, utr=utr, payment_status='pending')
            sess.add(new)
            sess.commit()
        return {"status": "pending", "user_id": user_id}
    return {"status": "error", "detail": "DB unavailable"}


def approve_payment_request(user_id: str):
    """Approve a pending payment request."""
    if DB_AVAILABLE:
        sess = next(get_session())
        stmt = select(Subscription).where(Subscription.user_id == user_id)
        sub = sess.exec(stmt).first()
        if sub and sub.payment_status == 'pending':
            sub.active = True
            sub.payment_status = 'approved'
            from datetime import datetime, timedelta
            sub.start_at = datetime.utcnow()
            days = 30 if sub.plan == 'monthly' else 7
            sub.end_at = datetime.utcnow() + timedelta(days=days)
            sess.add(sub)
            sess.commit()
            return {"status": "active", "user_id": user_id, "plan": sub.plan}
    return {"status": "error", "detail": "No pending request"}


def get_pending_requests():
    """Get list of users waiting for approval."""
    if DB_AVAILABLE:
        sess = next(get_session())
        stmt = select(Subscription).where(Subscription.payment_status == 'pending')
        subs = sess.exec(stmt).all()
        return [{"user_id": s.user_id, "plan": s.plan, "utr": s.utr, "timestamp": str(s.id)} for s in subs]
    return []


def get_subscription_status(user_id: str) -> str:
    if DB_AVAILABLE:
        sess = next(get_session())
        stmt = select(Subscription).where(Subscription.user_id == user_id)
        sub = sess.exec(stmt).first()
        if not sub:
            return "none"
        return "active" if sub.active else "pending"

    return "none"


def get_subscription_details(user_id: str) -> dict:
    """Return subscription details including plan and status for a user."""
    if DB_AVAILABLE:
        sess = next(get_session())
        stmt = select(Subscription).where(Subscription.user_id == user_id)
        sub = sess.exec(stmt).first()
        if not sub:
            return {"status": "none", "plan": None, "payment_status": "none"}
        return {
            "status": ("active" if sub.active else "pending"), 
            "plan": (sub.plan or 'weekly'),
            "payment_status": getattr(sub, 'payment_status', 'none')
        }

    return {"status": SUBSCRIPTIONS.get(user_id, {}).get('status', 'none'), "plan": SUBSCRIPTIONS.get(user_id, {}).get('plan', 'weekly')}


def get_payment_info(user_id: str):
    """Return payment info for user if available (PaymentInfo table)."""
    if DB_AVAILABLE:
        try:
            from ..models import PaymentInfo
            sess = next(get_session())
            stmt = select(PaymentInfo).where(PaymentInfo.user_id == user_id)
            info = sess.exec(stmt).first()
            if not info:
                return None
            return {"user_id": info.user_id, "phonepe_qr_data": info.phonepe_qr_data, "upi_id": info.upi_id, "price_inr": info.price_inr}
        except Exception:
            return None
    return None

def verify_checkout_session(session_id: str) -> bool:
    """Verify a Stripe checkout session and activate the corresponding user subscription.
    Returns True if activated, False otherwise."""
    if not STRIPE_API_KEY:
        # In dev mode, we can't verify with Stripe; return False
        return False

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        # For subscription mode, a subscription is created on the session
        # check session.payment_status or subscription status
        user_id = session.metadata.get("user_id") if session.metadata else None
        paid = getattr(session, "payment_status", None) == "paid" or getattr(session, "status", None) == "complete"
        if user_id and paid:
            if DB_AVAILABLE:
                sess = next(get_session())
                stmt = select(Subscription).where(Subscription.user_id == user_id)
                sub = sess.exec(stmt).first()
                if sub:
                    from datetime import datetime, timedelta
                    sub.active = True
                    sub.start_at = datetime.utcnow()
                    sub.end_at = datetime.utcnow() + timedelta(days=7)
                    sub.stripe_session_id = session_id
                    sess.add(sub)
                    sess.commit()
                else:
                    new = Subscription(user_id=user_id, active=True, stripe_session_id=session_id)
                    sess.add(new)
                    sess.commit()
            else:
                # Fallback in-memory behavior
                SUBSCRIPTIONS[user_id] = {"status": "active", "session_id": session_id}
            return True
        return False
    except Exception:
        logger.exception("Failed to verify checkout session")
        return False


def handle_webhook_event(event: dict):
    """Handle relevant Stripe webhook events."""
    try:
        typ = event.get("type")
        data = event.get("data", {}).get("object", {})
        if typ == "checkout.session.completed":
            session_id = data.get("id")
            # retrieve metadata user_id
            user_id = data.get("metadata", {}).get("user_id")
            if user_id:
                if DB_AVAILABLE:
                    sess = next(get_session())
                    from sqlmodel import select
                    stmt = select(Subscription).where(Subscription.user_id == user_id)
                    sub = sess.exec(stmt).first()
                    if sub:
                        from datetime import datetime, timedelta
                        sub.active = True
                        sub.start_at = datetime.utcnow()
                        sub.end_at = datetime.utcnow() + timedelta(days=7)
                        sub.stripe_session_id = session_id
                        sess.add(sub)
                        sess.commit()
                    else:
                        new = Subscription(user_id=user_id, active=True, stripe_session_id=session_id)
                        sess.add(new)
                        sess.commit()
                else:
                    SUBSCRIPTIONS[user_id] = {"status": "active", "session_id": session_id}
                return True
        elif typ == "invoice.payment_succeeded":
            # subscription recurring payment succeeded
            user_id = data.get("metadata", {}).get("user_id")
            if user_id:
                if DB_AVAILABLE:
                    sess = next(get_session())
                    stmt = select(Subscription).where(Subscription.user_id == user_id)
                    sub = sess.exec(stmt).first()
                    if sub:
                        from datetime import datetime, timedelta
                        sub.active = True
                        sub.start_at = datetime.utcnow()
                        sub.end_at = datetime.utcnow() + timedelta(days=7)
                        sess.add(sub)
                        sess.commit()
                    else:
                        new = Subscription(user_id=user_id, active=True)
                        sess.add(new)
                        sess.commit()
                else:
                    SUBSCRIPTIONS[user_id] = {"status": "active", "session_id": data.get("id")}
                return True
    except Exception:
        logger.exception("Error handling webhook event")
    return False
