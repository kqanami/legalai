from database import SessionLocal
from models import User

def link_email(phone: str, email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            print(f"User with {phone} not found.")
            return

        user.email = email
        user.auth_provider = 'google'
        db.commit()
        print(f"Email {email} linked to {phone} (ID: {user.id}, Role: {user.role}).")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    link_email("+77476523346", "zimok20061@gmail.com")
