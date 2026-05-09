from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from .routes.chat import router

app = FastAPI()

@app.get("/")
async def root():
    return {"status": "ok", "service": "smart-sense-ai backend"}

# Dev: return exception traces in the response (truncated) to help debug 500s quickly
from fastapi.responses import JSONResponse
import traceback
import logging

logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def dev_exception_handler(request, exc):
    tb = ''.join(traceback.format_exception(None, exc, exc.__traceback__))
    logger.exception("Unhandled exception: %s", tb)
    return JSONResponse(status_code=500, content={"detail": "internal server error", "trace": tb[:1000]})

# Initialize DB on startup
from .db import init_db

@app.on_event("startup")
async def on_startup():
    init_db()

# Serve routes under /api so the frontend proxy can forward to the correct path
app.include_router(router, prefix="/api")

# Add more routing modules
from .routes.generate import router as generate_router
app.include_router(generate_router, prefix="/api")

# Activity history
from .routes.history import router as history_router
app.include_router(history_router, prefix="/api")
