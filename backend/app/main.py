from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
import logging

from .routes.chat import router as chat_router
from .routes.generate import router as generate_router
from .routes.history import router as history_router

app = FastAPI(title="Smart Sense AI Backend")

# ── CORS ───────────────────────────────────────────────────────────────────────
_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        _frontend_url,
        "https://smart-sense-ai-frontend.onrender.com",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)

# ── Exception handler ──────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def dev_exception_handler(request, exc):
    tb = "".join(traceback.format_exception(None, exc, exc.__traceback__))
    logger.exception("Unhandled exception: %s", tb)
    return JSONResponse(
        status_code=500,
        content={"detail": "internal server error", "trace": tb[:1000]},
    )

# ── DB startup ─────────────────────────────────────────────────────────────────
from .db import init_db

@app.on_event("startup")
async def on_startup():
    init_db()

# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "ok", "service": "smart-sense-ai backend"}

# ── Routes ─────────────────────────────────────────────────────────────────────
app.include_router(chat_router,     prefix="/api")
app.include_router(generate_router, prefix="/api")
app.include_router(history_router,  prefix="/api")
