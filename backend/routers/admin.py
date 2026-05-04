import logging
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, LawyerProfile, Case, ClientReview, EscalationRequest, SpecializationCategory, ChatMessage
from auth import create_token
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

# ── Schemas ──
class AdminStatsResponse(BaseModel):
    total_users: int
    total_lawyers: int
    verified_lawyers: int
    total_cases: int
    active_cases: int
    total_escalations: int
    accepted_escalations: int

class ImpersonateResponse(BaseModel):
    token: str
    user: dict

class VerifyLawyerRequest(BaseModel):
    verified: bool

# ── Endpoints ──

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(db: Session = Depends(get_db)):
    """Full system overview stats."""
    return {
        "total_users": db.query(User).count(),
        "total_lawyers": db.query(LawyerProfile).count(),
        "verified_lawyers": db.query(LawyerProfile).filter(LawyerProfile.verified == True).count(),
        "total_cases": db.query(Case).count(),
        "active_cases": db.query(Case).filter(Case.status == "active").count(),
        "total_escalations": db.query(EscalationRequest).count(),
        "accepted_escalations": db.query(EscalationRequest).filter(EscalationRequest.status == "accepted").count(),
    }

@router.get("/users")
def get_all_users(role: Optional[str] = None, db: Session = Depends(get_db)):
    """List all users with advanced filtering."""
    query = db.query(User).order_by(User.created_at.desc())
    if role:
        query = query.filter(User.role == role)
    
    users = query.all()
    result = []
    for u in users:
        lp = db.query(LawyerProfile).filter(LawyerProfile.user_id == u.id).first()
        result.append({
            "id": u.id,
            "name": u.name,
            "phone": u.phone,
            "role": u.role,
            "city": u.city,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "is_lawyer": lp is not None,
            "lawyer_verified": lp.verified if lp else False,
            "lawyer_rating": lp.rating if lp else None
        })
    return result

@router.get("/lawyers")
def get_all_lawyers(verified: Optional[bool] = None, db: Session = Depends(get_db)):
    """List all lawyers for verification management."""
    query = db.query(LawyerProfile).join(User)
    if verified is not None:
        query = query.filter(LawyerProfile.verified == verified)
    
    lawyers = query.order_by(LawyerProfile.id.desc()).all()
    result = []
    for lp in lawyers:
        result.append({
            "id": lp.id,
            "user_id": lp.user.id,
            "name": lp.user.name,
            "city": lp.city,
            "specialization": lp.specialization,
            "license_number": lp.license_number,
            "iin": lp.iin,
            "verified": lp.verified,
            "rating": lp.rating,
            "cases_won": lp.cases_won,
            "win_rate": lp.win_rate
        })
    return result

@router.patch("/lawyers/{lawyer_id}/verify")
def verify_lawyer(lawyer_id: int, req: VerifyLawyerRequest, db: Session = Depends(get_db)):
    """Approve or revoke lawyer verification."""
    lp = db.query(LawyerProfile).filter(LawyerProfile.id == lawyer_id).first()
    if not lp:
        raise HTTPException(status_code=404, detail="Юрист не найден")
    lp.verified = req.verified
    db.commit()
    return {"success": True, "verified": lp.verified}

@router.get("/escalations")
def get_all_escalations(db: Session = Depends(get_db)):
    """Monitor all AI->Lawyer leads globally."""
    escalations = db.query(EscalationRequest).order_by(EscalationRequest.created_at.desc()).limit(100).all()
    result = []
    for e in escalations:
        result.append({
            "id": e.id,
            "user_name": e.user.name if e.user else "Unknown",
            "category": e.category,
            "status": e.status,
            "urgency": e.urgency,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "assigned_lawyer": e.assigned_lawyer.user.name if e.assigned_lawyer else None
        })
    return result

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Hard delete a user and all their data."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    db.delete(u)
    db.commit()
    return {"success": True}

@router.post("/impersonate/{user_id}", response_model=ImpersonateResponse)
def impersonate_user(user_id: int, db: Session = Depends(get_db)):
    """Generate a token for ANY user to quickly switch accounts."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    token = create_token(user_id=user.id)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "role": user.role,
            "city": user.city
        }
    }

@router.post("/seed")
def seed_database(db: Session = Depends(get_db)):
    """Seed the database with mock lawyers, reviews, and cases for testing."""
    existing = db.query(LawyerProfile).count()
    if existing > 5:
        return {"success": True, "message": "В базе уже есть юристы, сидирование пропущено."}

    cities = ['Алматы', 'Астана', 'Шымкент']
    first_names = ['Азамат', 'Тимур', 'Руслан', 'Арман', 'Данияр', 'Айнур', 'Динара', 'Асель', 'Мадина']
    last_names = ['Омаров', 'Сыздыков', 'Ахметов', 'Иванов', 'Кусаинов', 'Асанова', 'Жумабаева']

    specs = db.query(SpecializationCategory).all()
    if not specs:
        raise HTTPException(status_code=400, detail="Сначала нужно инициализировать специализации (зайдите в /lawyers)")

    new_lawyers = []
    for i in range(15):
        user = User(
            name=f"{random.choice(first_names)} {random.choice(last_names)}",
            phone=f"+777700020{i:02d}",
            role="lawyer",
            city=random.choice(cities)
        )
        db.add(user)
        db.flush()

        lawyer_specs = random.sample(specs, random.randint(1, 3))
        main_spec = lawyer_specs[0].name_ru

        cases_total = random.randint(5, 50)
        cases_won = int(cases_total * random.uniform(0.6, 0.95))
        
        profile = LawyerProfile(
            user_id=user.id,
            iin=f"800101400{i:03d}",
            license_number=f"№{random.randint(1000, 9999)} от 20{random.randint(10, 23)}",
            specialization=main_spec,
            verified=random.choice([True, True, False]),
            bio="Опытный юрист с многолетней практикой в судах Казахстана. Защищаю интересы клиентов до победного конца.",
            rating=round(random.uniform(3.8, 5.0), 1),
            cases_won=cases_won,
            cases_total=cases_total,
            city=user.city,
            experience_years=random.randint(3, 20),
            is_accepting_clients=True,
            response_time_hours=round(random.uniform(0.5, 5.0), 1)
        )
        profile.specializations.extend(lawyer_specs)
        db.add(profile)
        db.flush()
        new_lawyers.append(profile)

    # Generate some reviews
    for lp in new_lawyers:
        for _ in range(random.randint(2, 10)):
            review = ClientReview(
                lawyer_id=lp.id,
                reviewer_id=user.id,
                rating=round(random.uniform(3.5, 5.0), 1),
                comment="Отличный специалист, очень помог с делом!",
                is_anonymous=random.choice([True, False])
            )
            db.add(review)

    db.commit()
    return {"success": True, "message": f"Добавлено {len(new_lawyers)} тестовых юристов и отзывы."}
