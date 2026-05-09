from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    role: str
    text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Subscription(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    stripe_session_id: Optional[str] = None
    active: bool = False
    plan: Optional[str] = Field(default='weekly')  # 'weekly' or 'monthly'
    utr: Optional[str] = None
    payment_status: str = Field(default='none')  # none, pending, approved, rejected
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None

class PaymentInfo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, unique=True)
    phonepe_qr_data: Optional[str] = None
    upi_id: Optional[str] = None
    price_inr: int = 29
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserActivity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    component: str  # e.g., 'LearningHub', 'ExcuseGenerator'
    input: Optional[str] = None
    output: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)