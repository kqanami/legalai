import os
import sys
import secrets
from dotenv import load_dotenv

# Explicitly load .env from the same directory as this file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

# ── Unified version constant ──
APP_VERSION = "3.1.0"


class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 72

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./legal_assistant.db")
    UPLOAD_DIR: str = os.path.join(os.path.dirname(__file__), "uploads")
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB

    # Security settings
    DEBUG_MODE: bool = os.getenv("DEBUG_MODE", "true").lower() in ("true", "1", "yes")
    RATE_LIMIT: str = os.getenv("RATE_LIMIT", "10/minute")
    AI_RATE_LIMIT: str = os.getenv("AI_RATE_LIMIT", "5/minute")

    def validate(self):
        """Validate critical settings on startup."""
        if not self.JWT_SECRET or self.JWT_SECRET == "fallback-secret-change-me":
            if self.DEBUG_MODE:
                self.JWT_SECRET = secrets.token_hex(32)
                print("[WARN] JWT_SECRET not set. Generated random key for this session. Set JWT_SECRET in .env for production!")
            else:
                print("[FATAL] JWT_SECRET is not configured. Set it in .env file. Exiting.")
                sys.exit(1)

        if not self.GEMINI_API_KEY and not self.GROQ_API_KEY:
            print("[WARN] No AI API keys configured (GEMINI_API_KEY, GROQ_API_KEY). AI features will use mock mode.")

        if self.DEBUG_MODE:
            print("[WARN] DEBUG_MODE is ON. Test OTP code 111111 is active. Disable in production!")


settings = Settings()
settings.validate()

# Create uploads directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
