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
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    # ── LLM Provider Switching ──
    # Options: "claude", "gemini", "groq"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
    # Fast model (Gemini 1.5 Flash)
    LLM_MODEL_FAST: str = os.getenv("LLM_MODEL_FAST", "gemini-1.5-flash")
    # Smart model (Gemini 1.5 Pro)
    LLM_MODEL_SMART: str = os.getenv("LLM_MODEL_SMART", "gemini-1.5-pro")
    # Cheap model (Gemini 1.5 Flash)
    LLM_MODEL_CHEAP: str = os.getenv("LLM_MODEL_CHEAP", "gemini-1.5-flash")

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

        # ── LLM Provider Validation ──
        valid_providers = ("claude", "gemini", "groq")
        if self.LLM_PROVIDER not in valid_providers:
            print(f"[WARN] Unknown LLM_PROVIDER='{self.LLM_PROVIDER}'. Falling back to 'claude'. Valid: {valid_providers}")
            self.LLM_PROVIDER = "claude"

        if self.LLM_PROVIDER == "claude" and not self.ANTHROPIC_API_KEY:
            print("[FATAL] LLM_PROVIDER=claude but ANTHROPIC_API_KEY is not set. Set it in .env!")
            sys.exit(1)
        elif self.LLM_PROVIDER == "gemini" and not self.GEMINI_API_KEY:
            print("[FATAL] LLM_PROVIDER=gemini but GEMINI_API_KEY is not set.")
            sys.exit(1)
        elif self.LLM_PROVIDER == "groq" and not self.GROQ_API_KEY:
            print("[FATAL] LLM_PROVIDER=groq but GROQ_API_KEY is not set.")
            sys.exit(1)
        else:
            print(f"[INFO] LLM Provider: {self.LLM_PROVIDER.upper()} | Fast: {self.LLM_MODEL_FAST} | Smart: {self.LLM_MODEL_SMART}")

        if not self.GEMINI_API_KEY and not self.GROQ_API_KEY and not self.ANTHROPIC_API_KEY:
            print("[WARN] No AI API keys configured. AI features will use mock mode.")

        if self.DEBUG_MODE:
            print("[WARN] DEBUG_MODE is ON. Test OTP code 111111 is active. Disable in production!")


settings = Settings()
settings.validate()

# Create uploads directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
