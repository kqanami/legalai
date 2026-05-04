import os
from config import settings


class SMSService:
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_FROM_NUMBER")
        self.client = None
        self.is_active = False

        if self.account_sid and self.auth_token:
            try:
                from twilio.rest import Client
                self.client = Client(self.account_sid, self.auth_token)
                self.is_active = True
                print("[OK] Twilio SMS Client initialized successfully.")
            except ImportError:
                print("[WARN] Twilio module not installed. Using Mock SMS mode (code: 111111)")
            except Exception as e:
                print(f"[WARN] Twilio init error: {e}. Using Mock SMS mode.")
        else:
            print("[INFO] Twilio credentials not found. Using Mock SMS mode (code: 111111)")

    def send_otp(self, phone: str, otp: str) -> bool:
        """Sends OTP via Twilio. Falls back to mock if not configured."""
        if not self.is_active or not self.client:
            print(f"[MOCK SMS] OTP {otp} → {phone}")
            return True

        try:
            message = self.client.messages.create(
                body=f"Ваш код авторизации AI Legal Assistant: {otp}",
                from_=self.from_number,
                to=phone
            )
            print(f"[OK] Sent SMS to {phone}, SID: {message.sid}")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to send SMS to {phone}: {e}")
            return False


sms_service = SMSService()
