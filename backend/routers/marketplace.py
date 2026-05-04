"""
Marketplace Router — Public lawyer discovery and rankings.
Powers the "Choice Architecture" — showing Top-3 instead of 100.
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from auth import get_current_user
from models import (User, LawyerProfile, ClientReview, EscalationRequest,
                    LawyerNotification, SpecializationCategory)
from schemas import (LawyerPublicProfileResponse, LawyerSearchResult,
                     LawyerRankingItem, RankingsResponse,
                     ReviewCreate, ReviewResponse,
                     NotificationResponse)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/lawyers", tags=["marketplace"])


@router.get("/search", response_model=LawyerSearchResult)
def search_lawyers(
    city: str = Query(None, description="Filter by city"),
    specialization: str = Query(None, description="Filter by specialization"),
    q: str = Query(None, description="Search by name"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Search lawyers with filters — the marketplace core."""
    query = db.query(LawyerProfile).filter(LawyerProfile.is_accepting_clients == True)
    
    if city:
        query = query.filter(LawyerProfile.city.ilike(f"%{city}%"))
    
    if specialization:
        query = query.filter(
            LawyerProfile.specialization.ilike(f"%{specialization}%")
        )
    
    if q:
        query = query.join(User, LawyerProfile.user_id == User.id).filter(
            User.name.ilike(f"%{q}%")
        )
    
    total = query.count()
    lawyers = (
        query
        .order_by(LawyerProfile.rating.desc(), LawyerProfile.cases_won.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    
    result = []
    for lp in lawyers:
        review_count = db.query(ClientReview).filter(ClientReview.lawyer_id == lp.id).count()
        specs = [s.name_ru for s in lp.specializations] if lp.specializations else []
        result.append(LawyerPublicProfileResponse(
            id=lp.id,
            name=lp.user.name,
            specialization=lp.specialization,
            specializations=specs,
            verified=lp.verified,
            bio=lp.bio,
            rating=lp.rating,
            cases_won=lp.cases_won,
            cases_total=lp.cases_total,
            win_rate=lp.win_rate,
            is_top_rated=lp.is_top_rated,
            city=lp.city,
            experience_years=lp.experience_years,
            is_accepting_clients=lp.is_accepting_clients,
            photo_url=lp.photo_url,
            response_time_hours=lp.response_time_hours,
            review_count=review_count,
        ))
    
    return LawyerSearchResult(lawyers=result, total=total, page=page, per_page=per_page)


@router.get("/rankings", response_model=RankingsResponse)
def get_rankings(
    city: str = Query(None),
    specialization: str = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Global lawyer rankings — the leaderboard."""
    query = db.query(LawyerProfile).filter(LawyerProfile.cases_total > 0)
    
    if city:
        query = query.filter(LawyerProfile.city.ilike(f"%{city}%"))
    if specialization:
        query = query.filter(LawyerProfile.specialization.ilike(f"%{specialization}%"))
    
    total = query.count()
    lawyers = (
        query
        .order_by(LawyerProfile.rating.desc(), LawyerProfile.cases_won.desc())
        .limit(limit)
        .all()
    )
    
    rankings = []
    for lp in lawyers:
        review_count = db.query(ClientReview).filter(ClientReview.lawyer_id == lp.id).count()
        rankings.append(LawyerRankingItem(
            id=lp.id,
            name=lp.user.name,
            specialization=lp.specialization,
            city=lp.city,
            rating=lp.rating,
            win_rate=lp.win_rate,
            cases_won=lp.cases_won,
            cases_total=lp.cases_total,
            is_top_rated=lp.is_top_rated,
            verified=lp.verified,
            review_count=review_count,
        ))
    
    return RankingsResponse(rankings=rankings, total=total)


@router.get("/{lawyer_id}/public-profile", response_model=LawyerPublicProfileResponse)
def get_public_profile(
    lawyer_id: int,
    db: Session = Depends(get_db),
):
    """Get a lawyer's public profile — the profile page."""
    lp = db.query(LawyerProfile).filter(LawyerProfile.id == lawyer_id).first()
    if not lp:
        raise HTTPException(status_code=404, detail="Юрист не найден")
    
    review_count = db.query(ClientReview).filter(ClientReview.lawyer_id == lp.id).count()
    specs = [s.name_ru for s in lp.specializations] if lp.specializations else []
    
    return LawyerPublicProfileResponse(
        id=lp.id,
        name=lp.user.name,
        specialization=lp.specialization,
        specializations=specs,
        verified=lp.verified,
        bio=lp.bio,
        rating=lp.rating,
        cases_won=lp.cases_won,
        cases_total=lp.cases_total,
        win_rate=lp.win_rate,
        is_top_rated=lp.is_top_rated,
        city=lp.city,
        experience_years=lp.experience_years,
        is_accepting_clients=lp.is_accepting_clients,
        photo_url=lp.photo_url,
        response_time_hours=lp.response_time_hours,
        review_count=review_count,
    )


@router.get("/{lawyer_id}/reviews", response_model=List[ReviewResponse])
def get_reviews(
    lawyer_id: int,
    db: Session = Depends(get_db),
):
    """Get reviews for a lawyer."""
    lp = db.query(LawyerProfile).filter(LawyerProfile.id == lawyer_id).first()
    if not lp:
        raise HTTPException(status_code=404, detail="Юрист не найден")
    
    reviews = (
        db.query(ClientReview)
        .filter(ClientReview.lawyer_id == lawyer_id)
        .order_by(ClientReview.created_at.desc())
        .all()
    )
    
    result = []
    for r in reviews:
        reviewer_name = None
        if not r.is_anonymous:
            reviewer_name = r.reviewer.name if r.reviewer else "Клиент"
        result.append(ReviewResponse(
            id=r.id,
            rating=r.rating,
            comment=r.comment,
            reviewer_name=reviewer_name,
            created_at=r.created_at,
        ))
    return result


@router.post("/{lawyer_id}/review", response_model=ReviewResponse)
def create_review(
    lawyer_id: int,
    req: ReviewCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Client leaves a review for a lawyer."""
    lp = db.query(LawyerProfile).filter(LawyerProfile.id == lawyer_id).first()
    if not lp:
        raise HTTPException(status_code=404, detail="Юрист не найден")
    
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Рейтинг должен быть от 1 до 5")
    
    review = ClientReview(
        lawyer_id=lawyer_id,
        reviewer_id=user.id,
        case_id=req.case_id,
        rating=req.rating,
        comment=req.comment,
        is_anonymous=req.is_anonymous,
    )
    db.add(review)
    
    # Recalculate lawyer rating
    all_reviews = db.query(ClientReview).filter(ClientReview.lawyer_id == lawyer_id).all()
    all_ratings = [r.rating for r in all_reviews] + [req.rating]
    lp.rating = round(sum(all_ratings) / len(all_ratings), 2)
    
    # Notify lawyer
    notification = LawyerNotification(
        lawyer_id=lawyer_id,
        type="new_review",
        title="Новый отзыв",
        message=f"{'Анонимный клиент' if req.is_anonymous else user.name} оставил отзыв: {'⭐' * int(req.rating)}",
        reference_id=review.id,
    )
    db.add(notification)
    
    db.commit()
    db.refresh(review)
    
    return ReviewResponse(
        id=review.id,
        rating=review.rating,
        comment=review.comment,
        reviewer_name=None if review.is_anonymous else user.name,
        created_at=review.created_at,
    )


# ── Notifications ──

@router.get("/notifications/my", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = Query(False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notifications for current lawyer."""
    if user.role != "lawyer":
        raise HTTPException(status_code=403, detail="Доступ только для юристов")
    
    profile = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль юриста не найден")
    
    query = db.query(LawyerNotification).filter(LawyerNotification.lawyer_id == profile.id)
    if unread_only:
        query = query.filter(LawyerNotification.is_read == False)
    
    notifications = query.order_by(LawyerNotification.created_at.desc()).limit(50).all()
    return notifications


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    if user.role != "lawyer":
        raise HTTPException(status_code=403, detail="Доступ только для юристов")
    
    profile = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль юриста не найден")
    
    notification = (
        db.query(LawyerNotification)
        .filter(LawyerNotification.id == notification_id, LawyerNotification.lawyer_id == profile.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    notification.is_read = True
    db.commit()
    return {"success": True}


@router.patch("/notifications/read-all")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    if user.role != "lawyer":
        raise HTTPException(status_code=403, detail="Доступ только для юристов")
    
    profile = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль юриста не найден")
    
    db.query(LawyerNotification).filter(
        LawyerNotification.lawyer_id == profile.id,
        LawyerNotification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"success": True}


# ── Specialization Categories (seed data) ──

@router.get("/specializations")
def get_specializations(db: Session = Depends(get_db)):
    """Get all specialization categories."""
    specs = db.query(SpecializationCategory).all()
    if not specs:
        # Seed default categories
        defaults = [
            ("labor", "Трудовое право", "Еңбек құқығы", "👷"),
            ("family", "Семейное право", "Отбасы құқығы", "👨‍👩‍👧"),
            ("criminal", "Уголовное право", "Қылмыстық құқық", "⚖️"),
            ("civil", "Гражданское право", "Азаматтық құқық", "📋"),
            ("corporate", "Корпоративное право", "Корпоративтік құқық", "🏢"),
            ("tax", "Налоговое право", "Салық құқығы", "💰"),
            ("real_estate", "Недвижимость", "Жылжымайтын мүлік", "🏠"),
            ("consumer", "Защита потребителей", "Тұтынушыларды қорғау", "🛒"),
            ("administrative", "Административное право", "Әкімшілік құқық", "🏛️"),
            ("intellectual", "Интеллектуальная собственность", "Зияткерлік меншік", "💡"),
        ]
        for key, name_ru, name_kz, icon in defaults:
            cat = SpecializationCategory(key=key, name_ru=name_ru, name_kz=name_kz, icon=icon)
            db.add(cat)
        db.commit()
        specs = db.query(SpecializationCategory).all()
    
    return [{"id": s.id, "key": s.key, "name_ru": s.name_ru, "name_kz": s.name_kz, "icon": s.icon} for s in specs]
