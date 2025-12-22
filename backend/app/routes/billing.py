from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from pydantic import BaseModel

from ..services import billing

router = APIRouter()


class CreateSessionRequest(BaseModel):
    user_id: str


@router.post("/billing/create-session")
async def create_session(req: CreateSessionRequest):
    url = billing.create_checkout_session(req.user_id)
    if not url:
        raise HTTPException(status_code=500, detail="Could not create checkout session")
    return {"subscribe_url": url}


@router.get("/billing/status")
async def status(user_id: Optional[str] = None):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    status = billing.get_subscription_status(user_id)
    return {"user_id": user_id, "status": status}


@router.post("/billing/verify")
async def verify(session_id: str):
    """Verify a Stripe session_id and activate subscription if successful."""
    ok = billing.verify_checkout_session(session_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Could not verify session or payment not completed")
    return {"session_id": session_id, "status": "active"}


# Webhook endpoint for Stripe to notify about completed checkouts / payments
@router.post("/billing/webhook")
async def webhook(request: Request):
    from fastapi import Header
    import os

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        # Not configured — accept events but do not verify signature (dev only)
        try:
            event = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid webhook payload")
    else:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Webhook signature verification failed: {exc}")

    # Delegate handling
    handled = billing.handle_webhook_event(event)
    if not handled:
        return {"received": True, "handled": False}
    return {"received": True, "handled": True}


# Dev mock-subscribe retained but gated by env flag (do not expose in production)
# Dev mock-subscribe - RESTRICTED to Admin or Dev Mode
@router.post("/billing/mock-subscribe")
async def mock_subscribe(request: Request):
    import os
    user_id = request.query_params.get("user_id")
    # Strict check: Only Admin can auto-subscribe themselves
    if user_id != 'ARUNA LAVANURU':
         raise HTTPException(status_code=403, detail="Auto-activation disabled. Please submit payment details.")
    
    allow = os.getenv("ALLOW_DEV_PAYMENTS", "false").lower() == "true"
    if not allow and user_id != 'ARUNA LAVANURU':
        raise HTTPException(status_code=403, detail="Dev mock subscribe disabled")
    
    plan = request.query_params.get("plan", "weekly")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    sub = billing.activate_subscription_for_user(user_id, plan=plan)
    return {"user_id": user_id, "status": sub}


class SubmitPaymentRequest(BaseModel):
    user_id: str
    plan: str
    utr: str

@router.post("/billing/submit-payment")
async def submit_payment(payload: SubmitPaymentRequest):
    """User submits UTR for verification."""
    res = billing.submit_payment_request(payload.user_id, payload.plan, payload.utr)
    return res


@router.get("/billing/pending-requests")
async def pending_requests(admin_id: str):
    """Admin lists pending requests."""
    # Simple security check
    if admin_id != 'ARUNA LAVANURU':
        raise HTTPException(status_code=403, detail="Unauthorized")
    return billing.get_pending_requests()


@router.post("/billing/approve-request")
async def approve_request(payload: dict):
    """Admin approves a request. Payload: { "user_id": "...", "admin_id": "..." }"""
    if payload.get('admin_id') != 'ARUNA LAVANURU':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    res = billing.approve_payment_request(payload.get('user_id'))
    return res


class PaymentInfoPayload(BaseModel):
    user_id: str
    phonepe_qr_data: Optional[str] = None
    upi_id: Optional[str] = None


@router.post('/billing/payment-info')
async def save_payment_info(payload: PaymentInfoPayload, request: Request):
    """Save or update a user's PhonePe QR data and UPI id."""
    if not payload.user_id:
        raise HTTPException(status_code=400, detail='user_id is required')
    # upsert into PaymentInfo table
    try:
        from ..db import get_session
        from ..models import PaymentInfo
        sess = next(get_session())
        from sqlmodel import select
        stmt = select(PaymentInfo).where(PaymentInfo.user_id == payload.user_id)
        existing = sess.exec(stmt).first()
        if existing:
            existing.phonepe_qr_data = payload.phonepe_qr_data or existing.phonepe_qr_data
            existing.upi_id = payload.upi_id or existing.upi_id
            sess.add(existing)
            sess.commit()
            return {'user_id': payload.user_id, 'status': 'updated'}
        new = PaymentInfo(user_id=payload.user_id, phonepe_qr_data=payload.phonepe_qr_data, upi_id=payload.upi_id)
        sess.add(new)
        sess.commit()
        return {'user_id': payload.user_id, 'status': 'created'}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get('/billing/payment-info')
async def get_payment_info(user_id: Optional[str] = None, requester: Optional[str] = None):
    """Get payment info for a user. PhonePe QR is public; UPI id only returned if requester == user_id."""
    if not user_id:
        raise HTTPException(status_code=400, detail='user_id is required')
    try:
        from ..db import get_session
        from ..models import PaymentInfo
        from sqlmodel import select
        sess = next(get_session())
        stmt = select(PaymentInfo).where(PaymentInfo.user_id == user_id)
        existing = sess.exec(stmt).first()
        if not existing:
            return { 'user_id': user_id, 'exists': False }
        from ..services.billing import get_subscription_details
        details = get_subscription_details(user_id)
        payload = {
            'user_id': existing.user_id,
            'phonepe_qr_data': existing.phonepe_qr_data,  # public
            'price_inr': existing.price_inr,
            'subscription': details,
            'plans': [
                {'plan': 'weekly', 'amount': 29, 'interval': 'week', 'bonus_requests': 3},
                {'plan': 'monthly', 'amount': 99, 'interval': 'month', 'bonus_requests': 20},
            ],
            'exists': True
        }
        # only show upi id to the account owner OR if it is the admin/merchant account
        if requester == user_id or user_id == 'ARUNA LAVANURU':
            payload['upi_id'] = existing.upi_id
        return payload
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
