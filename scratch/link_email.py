import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from database import SessionLocal
from models import User

def link_email(phone: str, email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            print(f"Пользователь с номером {phone} не найден.")
            return

        user.email = email
        user.auth_provider = 'google'
        db.commit()
        print(f"Email {email} успешно привязан к аккаунту {phone} (ID: {user.id}, Role: {user.role}).")
    except Exception as e:
        print(f"Ошибка: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    link_email("+77476523346", "zimok20061@gmail.com")
