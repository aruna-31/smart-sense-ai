from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

# Using a local SQLite DB for simple persistence in dev
DATABASE_URL = "sqlite:///./data.db"
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def init_db():
    SQLModel.metadata.create_all(engine)
    # Add missing columns for development schema migrations (simple, idempotent)
    from sqlmodel import text
    with engine.connect() as conn:
        try:
            # SQLAlchemy 2.0 requires text() for string statements
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info('subscription')")).fetchall()]
            if 'plan' not in cols:
                conn.execute(text("ALTER TABLE subscription ADD COLUMN plan TEXT DEFAULT 'weekly'"))
            if 'utr' not in cols:
                conn.execute(text("ALTER TABLE subscription ADD COLUMN utr TEXT"))
            if 'payment_status' not in cols:
                conn.execute(text("ALTER TABLE subscription ADD COLUMN payment_status TEXT DEFAULT 'none'"))
        except Exception:
            # If table doesn't exist or PRAGMA fails, ignore (create_all will handle it)
            pass


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
