from fastapi import APIRouter, UploadFile, File, HTTPException, Form
import os
from pathlib import Path

router = APIRouter()

@router.post('/billing/upload-qr')
async def upload_qr(user_id: str = Form(...), qr: UploadFile = File(...)):
    """Accept an uploaded QR image and save it into the frontend public folder so it becomes publicly visible.
    Returns the public URL path to the saved image.
    """
    # Validate filename
    safe_user = ''.join(c for c in user_id if c.isalnum() or c in ('_', '-')).lower()
    ext = Path(qr.filename).suffix or '.png'
    filename = f"phonepe-qr-{safe_user}{ext}"

    # Save into workspace public/ folder (Vite serves files in public/ at '/filename')
    public_dir = Path(__file__).resolve().parents[2] / 'public'
    if not public_dir.exists():
        public_dir.mkdir(parents=True, exist_ok=True)
    dest = public_dir / filename
    try:
        contents = await qr.read()
        with open(dest, 'wb') as f:
            f.write(contents)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Could not save file: {exc}')

    # Update PaymentInfo record
    try:
        from ..db import get_session
        from ..models import PaymentInfo
        from sqlmodel import select
        sess = next(get_session())
        stmt = select(PaymentInfo).where(PaymentInfo.user_id == user_id)
        existing = sess.exec(stmt).first()
        public_path = f"/{filename}"
        if existing:
            existing.phonepe_qr_data = public_path
            sess.add(existing)
            sess.commit()
        else:
            new = PaymentInfo(user_id=user_id, phonepe_qr_data=public_path)
            sess.add(new)
            sess.commit()
        return {'user_id': user_id, 'qr_path': public_path}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
