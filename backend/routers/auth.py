from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, LawyerProfile
from schemas import SendCodeRequest, VerifyRequest, RegisterRequest, RegisterLawyerRequest, AuthResponse, UserResponse
from auth import generate_otp, verify_otp, create_token, get_current_user, validate_phone

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/send-code")
def send_code(req: SendCodeRequest):
    """Send OTP to phone number."""
    phone = validate_phone(req.phone)
    generate_otp(phone)
    return {"success": True, "message": f"Код отправлен на {phone}"}


@router.post("/verify", response_model=AuthResponse)
def verify_code(req: VerifyRequest, db: Session = Depends(get_db)):
    """Verify OTP and login. Creates user if not exists."""
    phone = validate_phone(req.phone)

    if not verify_otp(phone, req.code):
        raise HTTPException(status_code=400, detail="Неверный код подтверждения")

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        # Auto-create user on first login
        user = User(name="Пользователь", phone=phone)
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_token(user.id)
    return AuthResponse(
        token=token,
        user=UserResponse.model_validate(user)
    )


@router.post("/register", response_model=AuthResponse)
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register new user with name, phone, and OTP."""
    phone = validate_phone(req.phone)

    if not verify_otp(phone, req.code):
        raise HTTPException(status_code=400, detail="Неверный код подтверждения")

    existing = db.query(User).filter(User.phone == phone).first()
    if existing:
        # Update name and return token
        existing.name = req.name
        db.commit()
        db.refresh(existing)
        token = create_token(existing.id)
        return AuthResponse(token=token, user=UserResponse.model_validate(existing))

    user = User(name=req.name, phone=phone)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id)
    return AuthResponse(token=token, user=UserResponse.model_validate(user))


@router.post("/register-lawyer", response_model=AuthResponse)
def register_lawyer(req: RegisterLawyerRequest, db: Session = Depends(get_db)):
    """Register new lawyer with IIN and license."""
    phone = validate_phone(req.phone)

    if not verify_otp(phone, req.code):
        raise HTTPException(status_code=400, detail="Неверный код подтверждения")

    existing_user = db.query(User).filter(User.phone == phone).first()
    
    if existing_user:
        user = existing_user
        user.name = req.name
        user.role = "lawyer"
    else:
        user = User(name=req.name, phone=phone, role="lawyer")
        db.add(user)
    
    db.commit()
    db.refresh(user)

    # Check if lawyer profile already exists
    existing_profile = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not existing_profile:
        profile = LawyerProfile(
            user_id=user.id,
            iin=req.iin,
            license_number=req.license_number,
            specialization=req.specialization
        )
        db.add(profile)
        db.commit()

    token = create_token(user.id)
    return AuthResponse(token=token, user=UserResponse.model_validate(user))

@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return UserResponse.model_validate(user)
