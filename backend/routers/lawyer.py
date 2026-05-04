import logging
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
from auth import get_current_user
from models import (User, LawyerProfile, Client, Case, CaseNote, CaseOutcome,
                    DocumentTemplate, ClientReview, EscalationRequest, LawyerNotification)
from schemas import (LawyerProfileResponse, ClientCreate, ClientResponse, 
                     CaseCreate, CaseUpdate, CaseResponse, CaseWithClientResponse,
                     CaseNoteCreate, CaseNoteResponse, CaseOutcomeCreate, CaseOutcomeResponse,
                     DocumentTemplateCreate, DocumentTemplateResponse, LawyerDashboardStats,
                     LawyerProfileUpdateRequest)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/lawyer", tags=["lawyer"])

def get_current_lawyer(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> LawyerProfile:
    if user.role != "lawyer":
        raise HTTPException(status_code=403, detail="Доступ только для юристов")
    profile = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль юриста не найден")
    return profile

# ── Profile ──
@router.get("/profile", response_model=LawyerProfileResponse)
def get_profile(profile: LawyerProfile = Depends(get_current_lawyer)):
    return profile

@router.patch("/profile", response_model=LawyerProfileResponse)
def update_profile(
    req: LawyerProfileUpdateRequest,
    profile: LawyerProfile = Depends(get_current_lawyer),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update lawyer profile and user info."""
    # Update User fields
    if req.name is not None:
        user.name = req.name
    if req.city is not None:
        user.city = req.city
        profile.city = req.city
    
    # Update LawyerProfile fields
    if req.specialization is not None:
        profile.specialization = req.specialization
    if req.experience_years is not None:
        profile.experience_years = req.experience_years
    if req.hourly_rate is not None:
        profile.hourly_rate = req.hourly_rate
    if req.description is not None:
        profile.bio = req.description
    if req.photo_url is not None:
        profile.photo_url = req.photo_url
    if req.is_accepting_clients is not None:
        profile.is_accepting_clients = req.is_accepting_clients
    
    db.commit()
    db.refresh(profile)
    db.refresh(user)
    return profile

# ── Clients ──
@router.get("/clients", response_model=List[ClientResponse])
def list_clients(profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    try:
        return db.query(Client).filter(Client.lawyer_id == profile.id).order_by(Client.created_at.desc()).all()
    except Exception as e:
        logger.error(f"Error in list_clients: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clients", response_model=ClientResponse)
def create_client(req: ClientCreate, profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    client = Client(lawyer_id=profile.id, **req.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@router.delete("/clients/{client_id}")
def delete_client(client_id: int, profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id, Client.lawyer_id == profile.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    db.delete(client)
    db.commit()
    return {"success": True, "message": "Клиент удален"}

# ── Cases ──
@router.get("/cases", response_model=List[CaseWithClientResponse])
def list_cases(profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    return db.query(Case).filter(Case.lawyer_id == profile.id).order_by(Case.updated_at.desc()).all()

@router.post("/cases", response_model=CaseResponse)
def create_case(req: CaseCreate, profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    # Verify client belongs to lawyer
    client = db.query(Client).filter(Client.id == req.client_id, Client.lawyer_id == profile.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    
    new_case = Case(lawyer_id=profile.id, **req.model_dump())
    db.add(new_case)
    profile.cases_total += 1
    db.commit()
    db.refresh(new_case)
    return new_case

@router.patch("/cases/{case_id}", response_model=CaseResponse)
def update_case(case_id: int, req: CaseUpdate, profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id, Case.lawyer_id == profile.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Дело не найдено")
    
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(case, key, value)
    
    db.commit()
    db.refresh(case)
    return case

@router.post("/cases/{case_id}/notes", response_model=CaseNoteResponse)
def add_case_note(case_id: int, req: CaseNoteCreate, profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id, Case.lawyer_id == profile.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Дело не найдено")
    
    note = CaseNote(case_id=case.id, content=req.content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

# ── Case Outcome — The core of Win-Rate ──
@router.post("/cases/{case_id}/outcome", response_model=CaseOutcomeResponse)
def set_case_outcome(
    case_id: int,
    req: CaseOutcomeCreate,
    profile: LawyerProfile = Depends(get_current_lawyer),
    db: Session = Depends(get_db),
):
    """Set case outcome — this is how win-rate gets calculated."""
    case = db.query(Case).filter(Case.id == case_id, Case.lawyer_id == profile.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Дело не найдено")
    
    # Check if outcome already exists
    existing = db.query(CaseOutcome).filter(CaseOutcome.case_id == case_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Результат уже установлен для этого дела")
    
    outcome = CaseOutcome(
        case_id=case_id,
        result=req.result,
        court_decision_number=req.court_decision_number,
        amount_won=req.amount_won,
        notes=req.notes,
    )
    db.add(outcome)
    
    # Update case status
    case.status = req.result
    case.closed_at = datetime.now(timezone.utc)
    
    # Update lawyer's win/loss counters
    if req.result == "won":
        profile.cases_won += 1
    
    # Recalculate rating based on win-rate trend
    if profile.cases_total > 0:
        new_win_rate = profile.cases_won / profile.cases_total
        # Rating influenced by win-rate (base 3.0 + win_rate * 2.0)
        profile.rating = round(min(5.0, max(1.0, 3.0 + new_win_rate * 2.0)), 2)
    
    db.commit()
    db.refresh(outcome)
    
    logger.info(f"Case {case_id} outcome set: {req.result} (Lawyer {profile.id}, Win Rate: {profile.win_rate}%)")
    return outcome

# ── Templates ──
@router.get("/templates", response_model=List[DocumentTemplateResponse])
def list_templates(profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    return db.query(DocumentTemplate).filter(DocumentTemplate.lawyer_id == profile.id).order_by(DocumentTemplate.created_at.desc()).all()

@router.post("/templates", response_model=DocumentTemplateResponse)
def create_template(req: DocumentTemplateCreate, profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    template = DocumentTemplate(lawyer_id=profile.id, **req.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

# ── Stats (Extended Dashboard) ──
@router.get("/dashboard-stats", response_model=LawyerDashboardStats)
def get_dashboard_stats(profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    try:
        total_clients = db.query(Client).filter(Client.lawyer_id == profile.id).count()
        active_cases = db.query(Case).filter(Case.lawyer_id == profile.id, Case.status == "active").count()
        total_templates = db.query(DocumentTemplate).filter(DocumentTemplate.lawyer_id == profile.id).count()
        
        # Use joinedload to prevent N+1 and potential serialization errors outside session
        recent_cases = db.query(Case)\
            .options(joinedload(Case.client))\
            .filter(Case.lawyer_id == profile.id)\
            .order_by(Case.updated_at.desc())\
            .limit(5).all()
            
        pending_leads = db.query(EscalationRequest).filter(
            EscalationRequest.lawyer_id == profile.id,
            EscalationRequest.status == "pending"
        ).count()
        total_reviews = db.query(ClientReview).filter(ClientReview.lawyer_id == profile.id).count()
        unread_notifications = db.query(LawyerNotification).filter(
            LawyerNotification.lawyer_id == profile.id,
            LawyerNotification.is_read == False
        ).count()
        
        return LawyerDashboardStats(
            total_clients=total_clients,
            active_cases=active_cases,
            total_templates=total_templates,
            recent_cases=recent_cases,
            cases_won=profile.cases_won,
            cases_total=profile.cases_total,
            rating=profile.rating,
            win_rate=profile.win_rate,
            is_top_rated=profile.is_top_rated,
            pending_leads=pending_leads,
            total_reviews=total_reviews,
            unread_notifications=unread_notifications,
        )
    except Exception as e:
        logger.error(f"Error in get_dashboard_stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
