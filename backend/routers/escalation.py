"""
Escalation Router — The AI → Lawyer Bridge.
Handles the core funnel: when AI determines a case needs human expertise,
it creates an escalation request. Lawyers receive leads and respond.
"""
import logging
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import (User, EscalationRequest, LawyerProfile, Client,
                    LawyerNotification, ChatSession)
from schemas import (EscalationCreateRequest, EscalationRespondRequest,
                     EscalationResponse, EscalationForClient)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/escalation", tags=["escalation"])


@router.post("/request", response_model=EscalationForClient)
def create_escalation(
    req: EscalationCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an escalation request — AI recommends a lawyer."""
    escalation = EscalationRequest(
        user_id=user.id,
        session_id=req.session_id,
        lawyer_id=req.lawyer_id,
        category=req.category,
        city=req.city or user.city,
        description=req.description,
        ai_analysis=req.ai_analysis,
        urgency=req.urgency,
    )
    db.add(escalation)
    db.commit()
    db.refresh(escalation)

    # If a specific lawyer was selected, notify them and auto-add to clients
    if req.lawyer_id:
        _notify_lawyer(db, req.lawyer_id, escalation)
        
        # System automatically "throws" into clients those who selected a specific lawyer
        existing_client = db.query(Client).filter(
            Client.lawyer_id == req.lawyer_id,
            Client.user_id == user.id
        ).first()
        
        if not existing_client:
            new_client = Client(
                lawyer_id=req.lawyer_id,
                user_id=user.id,
                name=user.name,
                phone=user.phone,
                source="marketplace_selection",
                notes=f"Автоматически добавлен: выбрал юриста для консультации ({escalation.category})",
            )
            db.add(new_client)
            logger.info(f"Auto-added user {user.id} to lawyer {req.lawyer_id} clients list via marketplace selection")
    else:
        # Broadcast to top lawyers in the category/city
        _broadcast_to_matching_lawyers(db, escalation)

    lawyer_name = None
    lawyer_rating = None
    if escalation.assigned_lawyer:
        lawyer_name = escalation.assigned_lawyer.user.name
        lawyer_rating = escalation.assigned_lawyer.rating

    return EscalationForClient(
        id=escalation.id,
        category=escalation.category,
        description=escalation.description,
        status=escalation.status,
        lawyer_name=lawyer_name,
        lawyer_rating=lawyer_rating,
        created_at=escalation.created_at,
    )


@router.get("/my-requests", response_model=List[EscalationForClient])
def get_my_escalations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all escalation requests made by current user."""
    escalations = (
        db.query(EscalationRequest)
        .filter(EscalationRequest.user_id == user.id)
        .order_by(EscalationRequest.created_at.desc())
        .all()
    )
    result = []
    for e in escalations:
        lawyer_name = None
        lawyer_rating = None
        if e.assigned_lawyer:
            lawyer_name = e.assigned_lawyer.user.name
            lawyer_rating = e.assigned_lawyer.rating
        result.append(EscalationForClient(
            id=e.id,
            category=e.category,
            description=e.description,
            status=e.status,
            lawyer_name=lawyer_name,
            lawyer_rating=lawyer_rating,
            created_at=e.created_at,
        ))
    return result


@router.get("/leads", response_model=List[EscalationResponse])
def get_lawyer_leads(
    status: str = Query(None, description="Filter by status"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get escalation requests assigned to current lawyer."""
    if user.role != "lawyer":
        raise HTTPException(status_code=403, detail="Доступ только для юристов")
    
    profile = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль юриста не найден")

    query = db.query(EscalationRequest).filter(EscalationRequest.lawyer_id == profile.id)
    if status:
        query = query.filter(EscalationRequest.status == status)
    
    leads = query.order_by(EscalationRequest.created_at.desc()).all()
    
    result = []
    for lead in leads:
        result.append(EscalationResponse(
            id=lead.id,
            user_id=lead.user_id,
            user_name=lead.user.name,
            session_id=lead.session_id,
            category=lead.category,
            city=lead.city,
            description=lead.description,
            ai_analysis=lead.ai_analysis,
            status=lead.status,
            urgency=lead.urgency,
            created_at=lead.created_at,
            responded_at=lead.responded_at,
        ))
    return result


@router.patch("/{escalation_id}/respond")
def respond_to_escalation(
    escalation_id: int,
    req: EscalationRespondRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lawyer accepts or declines an escalation request."""
    if user.role != "lawyer":
        raise HTTPException(status_code=403, detail="Доступ только для юристов")
    
    profile = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль юриста не найден")

    escalation = (
        db.query(EscalationRequest)
        .filter(EscalationRequest.id == escalation_id, EscalationRequest.lawyer_id == profile.id)
        .first()
    )
    if not escalation:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if escalation.status != "pending":
        raise HTTPException(status_code=400, detail="Заявка уже обработана")

    if req.action == "accept":
        escalation.status = "accepted"
        escalation.responded_at = datetime.now(timezone.utc)
        
        # Auto-create client from escalation
        client = Client(
            lawyer_id=profile.id,
            user_id=escalation.user_id,
            name=escalation.user.name,
            phone=escalation.user.phone,
            source="escalation",
            notes=f"AI-эскалация: {escalation.description[:200]}",
        )
        db.add(client)
        
        logger.info(f"Lawyer {profile.id} accepted escalation {escalation.id}")
    elif req.action == "decline":
        escalation.status = "declined"
        escalation.responded_at = datetime.now(timezone.utc)
        logger.info(f"Lawyer {profile.id} declined escalation {escalation.id}")
    else:
        raise HTTPException(status_code=400, detail="Неверное действие. Используйте 'accept' или 'decline'")

    db.commit()
    return {"success": True, "status": escalation.status}


def _notify_lawyer(db: Session, lawyer_id: int, escalation: EscalationRequest):
    """Send notification to a specific lawyer about a new lead."""
    notification = LawyerNotification(
        lawyer_id=lawyer_id,
        type="new_lead",
        title="Новая заявка от клиента",
        message=f"Категория: {escalation.category}. {escalation.description[:100]}...",
        reference_id=escalation.id,
    )
    db.add(notification)
    db.commit()


def _broadcast_to_matching_lawyers(db: Session, escalation: EscalationRequest):
    """Notify top 5 matching lawyers about a new unassigned lead."""
    query = db.query(LawyerProfile).filter(LawyerProfile.is_accepting_clients == True)
    
    if escalation.city:
        query = query.filter(LawyerProfile.city == escalation.city)
    
    if escalation.category:
        query = query.filter(
            LawyerProfile.specialization.ilike(f"%{escalation.category}%")
        )
    
    top_lawyers = query.order_by(LawyerProfile.rating.desc()).limit(5).all()
    
    for lawyer in top_lawyers:
        notification = LawyerNotification(
            lawyer_id=lawyer.id,
            type="new_lead",
            title="Новая заявка от клиента (открытая)",
            message=f"Категория: {escalation.category}. {escalation.description[:100]}...",
            reference_id=escalation.id,
        )
        db.add(notification)
    
    db.commit()
