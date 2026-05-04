import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User, LawyerProfile, Client, Case, CaseNote, DocumentTemplate
from schemas import (LawyerProfileResponse, ClientCreate, ClientResponse, 
                     CaseCreate, CaseUpdate, CaseResponse, CaseWithClientResponse, CaseNoteCreate, CaseNoteResponse,
                     DocumentTemplateCreate, DocumentTemplateResponse, LawyerDashboardStats)

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

# ── Clients ──
@router.get("/clients", response_model=List[ClientResponse])
def list_clients(profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    return db.query(Client).filter(Client.lawyer_id == profile.id).order_by(Client.created_at.desc()).all()

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
    db.commit()
    db.refresh(new_case)
    return new_case

@router.patch("/cases/{case_id}", response_model=CaseResponse)
def update_case(case_id: int, req: CaseUpdate, profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id, Case.lawyer_id == profile.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Дело не найдено")
    
    old_status = case.status
    
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(case, key, value)
    
    # Logic for rating calculation
    if "status" in update_data and update_data["status"] != old_status:
        if update_data["status"] == "won":
            profile.cases_won += 1
            profile.rating = min(5.0, profile.rating + 0.1)
        elif old_status == "won":
            profile.cases_won = max(0, profile.cases_won - 1)
            profile.rating = max(0.0, profile.rating - 0.1)
            
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

# ── Stats ──
@router.get("/dashboard-stats", response_model=LawyerDashboardStats)
def get_dashboard_stats(profile: LawyerProfile = Depends(get_current_lawyer), db: Session = Depends(get_db)):
    total_clients = db.query(Client).filter(Client.lawyer_id == profile.id).count()
    active_cases = db.query(Case).filter(Case.lawyer_id == profile.id, Case.status == "active").count()
    total_templates = db.query(DocumentTemplate).filter(DocumentTemplate.lawyer_id == profile.id).count()
    recent_cases = db.query(Case).filter(Case.lawyer_id == profile.id).order_by(Case.updated_at.desc()).limit(5).all()
    
    return LawyerDashboardStats(
        total_clients=total_clients,
        active_cases=active_cases,
        total_templates=total_templates,
        recent_cases=recent_cases,
        cases_won=profile.cases_won,
        rating=profile.rating
    )
