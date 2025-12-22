from fastapi import APIRouter, Depends, HTTPException, Header
from ..services.gemini import generate_text
from ..utils.limiter import rate_limit
from ..db import get_session
from ..models import ChatMessage, User
import logging
from sqlmodel import select

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/chat")
async def chat(
    payload: dict,
    x_user_id: str = Header(..., description="Temporary user id for rate limiting"),
    _: bool = Depends(rate_limit),
):
    # Debug logging to diagnose 500s during dev
    logger.info("/chat called, payload=%s, x_user_id=%s", payload, x_user_id)
    try:
        prompt = payload.get("prompt")
        model = payload.get("model")
        max_tokens = payload.get("max_tokens", 512)

        if not prompt:
            return {"text": "Prompt is required", "raw": {"error": "prompt_missing"}}

        # Persist user record if not exists and persist user's message
        sess = next(get_session())
        user = sess.exec(select(User).where(User.user_id == x_user_id)).first()
        if not user:
            user = User(user_id=x_user_id)
            sess.add(user)
            sess.commit()
        user_msg = ChatMessage(user_id=x_user_id, role='user', text=prompt)
        sess.add(user_msg)
        sess.commit()

        result = await generate_text(prompt, model=model, max_tokens=max_tokens)
        # Normalize result text
        res_text = ''
        if isinstance(result, dict) and 'text' in result:
            res_text = result['text']
        else:
            res_text = str(result)

        # Persist model response
        model_msg = ChatMessage(user_id=x_user_id, role='model', text=res_text)
        sess.add(model_msg)
        sess.commit()

        return {"text": res_text, "raw": result}
    except Exception as exc:
        # Catch-all fallback to avoid 500 responses during dev
        logger.exception("Chat endpoint error: %s", exc)
        return {"text": f"(dev fallback) Chat error: {exc}", "raw": {"error": str(exc)}}


@router.get('/chat/history')
async def history(x_user_id: str = Header(..., description='Temporary user id for rate limiting')):
    sess = next(get_session())
    from sqlmodel import select
    msgs = sess.exec(select(ChatMessage).where(ChatMessage.user_id == x_user_id).order_by(ChatMessage.timestamp)).all()
    return [{"role": m.role, "text": m.text, "timestamp": m.timestamp.isoformat()} for m in msgs]


@router.delete('/chat/history')
async def delete_history(x_user_id: str = Header(..., description='Temporary user id for rate limiting')):
    sess = next(get_session())
    sess.exec(select(ChatMessage).where(ChatMessage.user_id == x_user_id)).delete()
    sess.commit()
    return {"deleted": True}

