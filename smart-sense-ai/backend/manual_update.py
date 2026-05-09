import sys
import shutil
import os
from pathlib import Path
from sqlmodel import select, Session
from app.db import get_session, init_db, engine
from app.models import PaymentInfo, Subscription
from datetime import datetime, timedelta

USER_ID = "ARUNA LAVANURU"
UPI_ID = "7780294844@ybl"
IMAGE_PATH = r"C:/Users/aruna/.gemini/antigravity/brain/fc1801dd-ac6f-47ba-b3da-50b8e1882aed/uploaded_image_1766311320974.jpg"
PLAN = "monthly"

def run():
    print("Initializing DB...")
    init_db()  # Ensures tables exist
    
    with Session(engine) as sess:
        # 1. Handle Image
        print("Handling Image...")
        if not os.path.exists(IMAGE_PATH):
            print("Image not found!")
            return

        safe_user = ''.join(c for c in USER_ID if c.isalnum() or c in ('_', '-')).lower()
        ext = Path(IMAGE_PATH).suffix or '.png'
        filename = f"phonepe-qr-{safe_user}{ext}"
        
        # public dir relative to backend/
        # Root is ../
        public_dir = Path('../public').resolve()
        if not public_dir.exists():
            print(f"Public dir {public_dir} does not exist, creating...")
            public_dir.mkdir(parents=True, exist_ok=True)
            
        dest = public_dir / filename
        print(f"Copying {IMAGE_PATH} to {dest}")
        try:
            shutil.copy(IMAGE_PATH, dest)
        except Exception as e:
            print(f"Error copying: {e}")
            return

        public_path = f"/{filename}"
        print(f"Public path: {public_path}")

        # 2. Update PaymentInfo
        print("Updating PaymentInfo...")
        stmt = select(PaymentInfo).where(PaymentInfo.user_id == USER_ID)
        existing = sess.exec(stmt).first()
        if existing:
            print("Updating existing payment info...")
            existing.phonepe_qr_data = public_path
            existing.upi_id = UPI_ID
            sess.add(existing)
        else:
            print("Creating new payment info...")
            new = PaymentInfo(user_id=USER_ID, phonepe_qr_data=public_path, upi_id=UPI_ID)
            sess.add(new)
        sess.commit()

        # 3. Update Subscription
        print(f"Activating {PLAN} subscription...")
        stmt = select(Subscription).where(Subscription.user_id == USER_ID)
        sub = sess.exec(stmt).first()
        
        start = datetime.utcnow()
        if PLAN == 'monthly':
            end = start + timedelta(days=30)
        else:
            end = start + timedelta(days=7)
            
        if sub:
            print("Updating existing subscription...")
            sub.active = True
            sub.plan = PLAN
            sub.start_at = start
            sub.end_at = end
            sess.add(sub)
        else:
            print("Creating new subscription...")
            new = Subscription(user_id=USER_ID, active=True, plan=PLAN)
            new.start_at = start
            new.end_at = end
            sess.add(new)
        
        sess.commit()
        print("Done!")

if __name__ == "__main__":
    run()
