from database import SessionLocal
from models import User

def make_admin(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"User with {email} not found.")
            return

        user.role = 'admin'
        db.commit()
        print(f"User {email} is now admin (ID: {user.id}).")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    make_admin("zimok20061@gmail.com")
