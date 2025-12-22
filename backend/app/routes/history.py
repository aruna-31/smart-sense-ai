from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class HistoryPayload(BaseModel):
    user_id: str
    component: str
    input: Optional[str] = None
    output: Optional[str] = None


@router.post('/activity')
async def save_activity(payload: HistoryPayload):
    from ..db import get_session
    from ..models import UserActivity
    sess = next(get_session())
    try:
        entry = UserActivity(user_id=payload.user_id, component=payload.component, input=payload.input, output=payload.output)
        sess.add(entry)
        sess.commit()
        return {'status': 'saved', 'id': entry.id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get('/activity')
async def get_activity(user_id: str, component: Optional[str] = None):
    from ..db import get_session
    from ..models import UserActivity
    from sqlmodel import select
    sess = next(get_session())
    try:
        stmt = select(UserActivity).where(UserActivity.user_id == user_id)
        if component:
            stmt = stmt.where(UserActivity.component == component)
        results = sess.exec(stmt).all()
        return {'user_id': user_id, 'component': component, 'activities': [r.dict() for r in results]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))