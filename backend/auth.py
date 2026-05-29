import re
import jwt
import time
import logging
import random
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from config import settings
from database import get_db
from models import User
from services.sms_service import sms_service

logger = logging.getLogger(__name__)
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# ── Phone Validation ──
PHONE_REGEX = re.compile(r"^\+7\d{10}$")


def validate_phone(phone: str) -> str:
    """Validate and normalize Kazakhstan phone number format."""
    cleaned = re.sub(r"[\s\-\(\)]", "", phone)
    if not PHONE_REGEX.match(cleaned):
        raise HTTPException(
            status_code=400,
            detail="Неверный формат номера. Используйте формат +7XXXXXXXXXX (11 цифр)"
        )
    return cleaned


# ── OTP Storage with TTL (in-memory for MVP, use Redis in production) ──
_otp_store: dict[str, dict] = {}  # phone -> {"code": str, "expires": float, "attempts": int}

OTP_TTL_SECONDS = 300       # 5 minutes
OTP_MAX_ATTEMPTS = 5        # Max verification attempts per code
OTP_COOLDOWN_SECONDS = 60   # Min interval between sending codes


def _cleanup_expired():
    """Remove expired OTP entries."""
    now = time.time()
    expired = [k for k, v in _otp_store.items() if v["expires"] < now]
    for k in expired:
        del _otp_store[k]


def generate_otp(phone: str) -> str:
    """Generate and store a 6-digit OTP for a phone number with TTL."""
    _cleanup_expired()

    # Rate limit: check cooldown (skipped in DEBUG_MODE)
    existing = _otp_store.get(phone)
    if existing and not settings.DEBUG_MODE and existing["expires"] > time.time():
        time_since_created = OTP_TTL_SECONDS - (existing["expires"] - time.time())
        if time_since_created < OTP_COOLDOWN_SECONDS:
            remaining = int(OTP_COOLDOWN_SECONDS - time_since_created)
            raise HTTPException(
                status_code=429,
                detail=f"Подождите {remaining} сек. перед повторной отправкой кода"
            )

    code = str(random.randint(100000, 999999))
    _otp_store[phone] = {
        "code": code,
        "expires": time.time() + OTP_TTL_SECONDS,
        "attempts": 0,
    }

    # Send via Twilio service
    sms_service.send_otp(phone, code)
    logger.info(f"OTP generated for {phone[:7]}***")
    return code


def verify_otp(phone: str, code: str) -> bool:
    """Verify OTP for a phone number with attempt limiting."""
    _cleanup_expired()

    # Test code only available in DEBUG_MODE
    if code == "111111" and settings.DEBUG_MODE:
        logger.warning(f"Test OTP 111111 used for {phone[:7]}*** (DEBUG_MODE)")
        return True

    stored = _otp_store.get(phone)
    if not stored:
        return False

    # Check max attempts
    if stored["attempts"] >= OTP_MAX_ATTEMPTS:
        _otp_store.pop(phone, None)
        raise HTTPException(
            status_code=429,
            detail="Превышено количество попыток. Запросите новый код."
        )

    stored["attempts"] += 1

    if stored["code"] == code:
        _otp_store.pop(phone, None)
        return True

    return False


def create_token(user_id: int) -> str:
    """Create a JWT token for a user."""
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """FastAPI dependency: extract current user from JWT token."""
    payload = decode_token(credentials.credentials)
    user_id = int(payload.get("sub", 0))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(*roles):
    """RBAC dependency factory: restricts endpoint access to specified roles."""
    def dependency(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ) -> User:
        payload = decode_token(credentials.credentials)
        user_id = int(payload.get("sub", 0))
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Недостаточно прав доступа")
        return user
    return Depends(dependency)
