import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import init_db
from config import settings
from routers import auth, chat, documents, counterparty, audit, stats, lawyer

# ── Logging Setup ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Rate Limiter ──
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("AI Legal Assistant KZ - Backend Starting...")
    init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="AI Legal Assistant KZ — API",
    description="Full-stack legal AI platform for Republic of Kazakhstan",
    version="2.1.0",
    lifespan=lifespan,
)

# ── Rate Limiting ──
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS — allow frontend dev server ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(counterparty.router)
app.include_router(audit.router)
app.include_router(stats.router)
app.include_router(lawyer.router)


@app.get("/")
def root():
    return {
        "service": "AI Legal Assistant KZ",
        "version": "2.1.0",
        "status": "online",
        "endpoints": {
            "auth": "/api/auth",
            "chat": "/api/chat",
            "documents": "/api/documents",
            "counterparty": "/api/counterparty",
            "audit": "/api/audit",
            "stats": "/api/stats",
        }
    }


@app.get("/health")
def health():
    return {"status": "ok"}
