import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import init_db
from config import settings, APP_VERSION
from routers import auth, chat, documents, counterparty, audit, stats, lawyer, escalation, marketplace, admin

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
    version=APP_VERSION,
    lifespan=lifespan,
)

# ── Rate Limiting ──
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"GLOBAL ERROR on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "message": str(exc),
            "path": request.url.path
        }
    )

# ── CORS — allow frontend dev server ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def maintenance_middleware(request: Request, call_next):
    # Only check if maintenance mode is enabled
    if getattr(settings, "MAINTENANCE_MODE", False):
        path = request.url.path
        # Exclude status checks, static docs, and public auth endpoints
        if path in ("/health", "/", "/api/auth/send-code", "/api/auth/verify", "/api/auth/register"):
            return await call_next(request)
            
        # Check if the user is an administrator
        auth_header = request.headers.get("Authorization")
        is_admin = False
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                import jwt
                from database import get_db
                from models import User
                
                db_gen = get_db()
                db = next(db_gen)
                try:
                    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
                    user_id = int(payload.get("sub", 0))
                    user = db.query(User).filter(User.id == user_id).first()
                    if user and user.role == "admin":
                        is_admin = True
                finally:
                    try:
                        next(db_gen)
                    except StopIteration:
                        pass
            except Exception:
                pass
                
        if not is_admin:
            return JSONResponse(
                status_code=503,
                content={
                    "detail": "MAINTENANCE_MODE",
                    "message": "В системе проводятся технические работы. Пожалуйста, зайдите позже."
                }
            )
            
    return await call_next(request)

# Register all routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(counterparty.router)
app.include_router(audit.router)
app.include_router(stats.router)
app.include_router(lawyer.router)
app.include_router(escalation.router)
app.include_router(marketplace.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {
        "service": "AI Legal Assistant KZ",
        "version": APP_VERSION,
        "status": "online",
        "endpoints": {
            "auth": "/api/auth",
            "chat": "/api/chat",
            "documents": "/api/documents",
            "counterparty": "/api/counterparty",
            "audit": "/api/audit",
            "stats": "/api/stats",
            "escalation": "/api/escalation",
            "lawyers": "/api/lawyers",
        }
    }


@app.get("/health")
def health():
    return {"status": "ok"}

