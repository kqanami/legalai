import logging
import random
import sys
import os
import subprocess
import threading
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, LawyerProfile, Case, ClientReview, EscalationRequest, SpecializationCategory, ChatMessage
from auth import create_token, require_role
from pydantic import BaseModel
from config import settings

logger = logging.getLogger(__name__)

class ScraperManager:
    def __init__(self):
        self.process = None
        self.current_key = None
        self.logs = []
        self.lock = threading.Lock()
        self._reader_thread = None

    def _read_stdout(self, process):
        try:
            for line in iter(process.stdout.readline, ''):
                if not line:
                    break
                with self.lock:
                    self.logs.append(line.strip())
                    if len(self.logs) > 500:
                        self.logs = self.logs[-500:]
            process.stdout.close()
        except Exception as e:
            with self.lock:
                self.logs.append(f"[SYSTEM] Log reader error: {str(e)}")

    def start(self, key: str = "all") -> tuple:
        with self.lock:
            if self.process and self.process.poll() is None:
                return False, "Скрапер уже запущен"
            
            self.current_key = key
            self.logs = ["[SYSTEM] Запуск процесса парсинга..."]
            
            # Find python executable
            python_exe = sys.executable or "python"
            
            # Build command
            cmd = [python_exe, "scripts/legislation_scraper.py"]
            if key == "all":
                cmd.append("--all")
            else:
                cmd.extend(["--key", key])

            try:
                # Start subprocess
                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
                )
                
                # Start background thread to read logs safely without blocking
                self._reader_thread = threading.Thread(
                    target=self._read_stdout,
                    args=(self.process,),
                    daemon=True
                )
                self._reader_thread.start()
                
                return True, "Скрапер успешно запущен"
            except Exception as e:
                return False, f"Ошибка запуска: {str(e)}"

    def stop(self) -> tuple:
        with self.lock:
            if not self.process or self.process.poll() is not None:
                return False, "Скрапер не запущен"
            
            try:
                self.process.terminate()
                self.logs.append("[SYSTEM] Запрос на остановку отправлен (SIGTERM)...")
                
                # Wait briefly to let it clean up, then kill if still alive
                try:
                    self.process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    self.process.kill()
                    self.logs.append("[SYSTEM] Процесс принудительно убит (SIGKILL).")
                
                self.logs.append("[SYSTEM] Парсинг остановлен.")
                return True, "Скрапер остановлен"
            except Exception as e:
                return False, f"Ошибка при остановке: {str(e)}"

    def get_status(self) -> dict:
        with self.lock:
            is_running = self.process is not None and self.process.poll() is None
            return {
                "is_running": is_running,
                "current_key": self.current_key,
                "logs": list(self.logs)
            }

# Global singleton
scraper_manager = ScraperManager()
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

# ── Endpoints (all require admin role) ──

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(user: User = require_role("admin"), db: Session = Depends(get_db)):
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
def get_all_users(role: Optional[str] = None, user: User = require_role("admin"), db: Session = Depends(get_db)):
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
            "plan": u.plan,
            "city": u.city,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "is_lawyer": lp is not None,
            "lawyer_verified": lp.verified if lp else False,
            "lawyer_rating": lp.rating if lp else None
        })
    return result

@router.get("/lawyers")
def get_all_lawyers(verified: Optional[bool] = None, user: User = require_role("admin"), db: Session = Depends(get_db)):
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
def verify_lawyer(lawyer_id: int, req: VerifyLawyerRequest, user: User = require_role("admin"), db: Session = Depends(get_db)):
    """Approve or revoke lawyer verification."""
    lp = db.query(LawyerProfile).filter(LawyerProfile.id == lawyer_id).first()
    if not lp:
        raise HTTPException(status_code=404, detail="Юрист не найден")
    lp.verified = req.verified
    db.commit()
    return {"success": True, "verified": lp.verified}

@router.get("/escalations")
def get_all_escalations(user: User = require_role("admin"), db: Session = Depends(get_db)):
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
def delete_user(user_id: int, user: User = require_role("admin"), db: Session = Depends(get_db)):
    """Hard delete a user and all their data."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if u.id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
    db.delete(u)
    db.commit()
    return {"success": True}

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    plan: Optional[str] = None

@router.patch("/users/{user_id}")
def update_user(user_id: int, req: UpdateUserRequest, user: User = require_role("admin"), db: Session = Depends(get_db)):
    """Update a user's details, plan, or role."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if req.name is not None:
        u.name = req.name
    if req.phone is not None:
        # Check uniqueness
        exist = db.query(User).filter(User.phone == req.phone, User.id != user_id).first()
        if exist:
            raise HTTPException(status_code=400, detail="Номер телефона уже занят")
        u.phone = req.phone
    if req.role is not None:
        if req.role not in ["citizen", "business", "lawyer", "admin"]:
            raise HTTPException(status_code=400, detail="Неверная роль")
        u.role = req.role
    if req.plan is not None:
        if req.plan not in ["freemium", "go", "ip", "business"]:
            raise HTTPException(status_code=400, detail="Неверный тарифный план")
        u.plan = req.plan
        
    db.commit()
    db.refresh(u)
    return {"success": True, "user": {"id": u.id, "name": u.name, "role": u.role, "plan": u.plan}}

@router.post("/impersonate/{user_id}", response_model=ImpersonateResponse)
def impersonate_user(user_id: int, user: User = require_role("admin"), db: Session = Depends(get_db)):
    """Generate a token for ANY user to quickly switch accounts. Admin only."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    logger.warning(f"Admin {user.id} ({user.name}) impersonating user {target.id} ({target.name})")
    
    token = create_token(user_id=target.id)
    return {
        "token": token,
        "user": {
            "id": target.id,
            "name": target.name,
            "phone": target.phone,
            "role": target.role,
            "city": target.city
        }
    }

@router.post("/seed")
def seed_database(user: User = require_role("admin"), db: Session = Depends(get_db)):
    """Seed the database with mock lawyers, reviews, and cases for testing."""
    existing = db.query(LawyerProfile).count()
    if existing > 5:
        return {"success": True, "message": "В базе уже есть юристы, сидирование пропущено."}

    cities = ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе']
    first_names = ['Азамат', 'Тимур', 'Руслан', 'Арман', 'Данияр', 'Айнур', 'Динара', 'Асель', 'Мадина', 'Бахыт']
    last_names = ['Омаров', 'Сыздыков', 'Ахметов', 'Иванов', 'Кусаинов', 'Асанова', 'Жумабаева', 'Нурланов', 'Бекетов']

    specs = db.query(SpecializationCategory).all()
    if not specs:
        raise HTTPException(status_code=400, detail="Сначала нужно инициализировать специализации (зайдите в /lawyers)")

    bios = [
        "Опытный юрист с многолетней практикой в судах Казахстана. Защищаю интересы клиентов до победного конца.",
        "Специализируюсь на корпоративном праве и арбитражных спорах. Более 200 выигранных дел.",
        "Консультирую малый и средний бизнес по вопросам налогового и трудового законодательства РК.",
        "Выпускник КазГЮА. Практикую защиту прав потребителей и семейные споры.",
    ]

    new_lawyers = []
    for i in range(15):
        u = User(
            name=f"{random.choice(first_names)} {random.choice(last_names)}",
            phone=f"+777700020{i:02d}",
            role="lawyer",
            city=random.choice(cities)
        )
        db.add(u)
        db.flush()

        lawyer_specs = random.sample(specs, random.randint(1, 3))
        main_spec = lawyer_specs[0].name_ru

        cases_total = random.randint(5, 50)
        cases_won = int(cases_total * random.uniform(0.6, 0.95))
        
        profile = LawyerProfile(
            user_id=u.id,
            iin=f"800101400{i:03d}",
            license_number=f"№{random.randint(1000, 9999)} от 20{random.randint(10, 23)}",
            specialization=main_spec,
            verified=random.choice([True, True, False]),
            bio=random.choice(bios),
            rating=round(random.uniform(3.8, 5.0), 1),
            cases_won=cases_won,
            cases_total=cases_total,
            city=u.city,
            experience_years=random.randint(3, 20),
            is_accepting_clients=True,
            response_time_hours=round(random.uniform(0.5, 5.0), 1)
        )
        profile.specializations.extend(lawyer_specs)
        db.add(profile)
        db.flush()
        new_lawyers.append(profile)

    # Generate some reviews — use a valid reviewer for each
    all_users = db.query(User).filter(User.role != "lawyer").limit(5).all()
    fallback_reviewer_id = all_users[0].id if all_users else user.id

    for lp in new_lawyers:
        for _ in range(random.randint(2, 10)):
            reviewer_id = random.choice(all_users).id if all_users else fallback_reviewer_id
            review = ClientReview(
                lawyer_id=lp.id,
                reviewer_id=reviewer_id,
                rating=round(random.uniform(3.5, 5.0), 1),
                comment=random.choice([
                    "Отличный специалист, очень помог с делом!",
                    "Профессиональный подход, рекомендую.",
                    "Быстро разобрался в ситуации и дал четкие рекомендации.",
                    "Благодарю за качественную юридическую помощь.",
                ]),
                is_anonymous=random.choice([True, False])
            )
            db.add(review)

    db.commit()
    return {"success": True, "message": f"Добавлено {len(new_lawyers)} тестовых юристов и отзывы."}

# ── Scraper Management Endpoints ──

class StartScraperRequest(BaseModel):
    key: str = "all"

@router.get("/scraper/status")
def get_scraper_status(user: User = require_role("admin")):
    """Get the current background legislation scraper status and logs."""
    return scraper_manager.get_status()

@router.post("/scraper/start")
def start_scraper(req: StartScraperRequest, user: User = require_role("admin")):
    """Start the legislation scraper in the background."""
    success, message = scraper_manager.start(req.key)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "detail": message}

@router.post("/scraper/stop")
def stop_scraper(user: User = require_role("admin")):
    """Stop the background legislation scraper immediately."""
    success, message = scraper_manager.stop()
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "detail": message}

# ── Advanced System Control & Audit Endpoints ──

@router.get("/audit-logs")
def get_audit_logs(user: User = require_role("admin"), db: Session = Depends(get_db)):
    """Fetch combined system activity logs for audit trails."""
    logs = []
    
    # 1. Recent Users
    users = db.query(User).order_by(User.created_at.desc()).limit(15).all()
    for u in users:
        logs.append({
            "timestamp": u.created_at.isoformat() if u.created_at else None,
            "category": "USER_AUTH",
            "message": f"Пользователь {u.name} ({u.phone}) зарегистрирован. Роль: {u.role.upper()}, Тариф: {u.plan.upper() if u.plan else 'FREE'}.",
            "user_id": u.id
        })
        
    # 2. Recent Escalations
    escalations = db.query(EscalationRequest).order_by(EscalationRequest.created_at.desc()).limit(15).all()
    for e in escalations:
        client = db.query(User).filter(User.id == e.user_id).first()
        client_name = client.name if client else f"User #{e.user_id}"
        logs.append({
            "timestamp": e.created_at.isoformat() if e.created_at else None,
            "category": "ESCALATION",
            "message": f"Создана эскалация по категории '{e.category}' от {client_name}. Срочность: {e.urgency.upper()}.",
            "user_id": e.user_id
        })

    # 3. Recent Cases
    cases = db.query(Case).order_by(Case.created_at.desc()).limit(15).all()
    for c in cases:
        lawyer_prof = db.query(LawyerProfile).filter(LawyerProfile.id == c.lawyer_id).first()
        lawyer_user = db.query(User).filter(User.id == lawyer_prof.user_id).first() if lawyer_prof else None
        lawyer_name = lawyer_user.name if lawyer_user else "Неизвестный юрист"
        logs.append({
            "timestamp": c.created_at.isoformat() if c.created_at else None,
            "category": "LEGAL_CASE",
            "message": f"Юрист {lawyer_name} добавил новое судебное дело '{c.title}' (Статус: {c.status.upper()}).",
            "user_id": lawyer_user.id if lawyer_user else None
        })

    # Sort all events chronologically (newest first)
    logs = [log for log in logs if log["timestamp"]]
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    return logs[:20]

@router.post("/maintenance/clear-chats")
def clear_chat_sessions(user: User = require_role("admin"), db: Session = Depends(get_db)):
    """Delete all chat messages and sessions from database."""
    try:
        db.query(ChatMessage).delete()
        # Clear sessions relationship cascade will clean up, but delete directly to be safe
        from models import ChatSession
        db.query(ChatSession).delete()
        db.commit()
        return {"success": True, "message": "Все чат-сессии и сообщения очищены"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/maintenance/reset-verifications")
def reset_verifications(user: User = require_role("admin"), db: Session = Depends(get_db)):
    """Revoke verification flag for all lawyers."""
    try:
        db.query(LawyerProfile).update({LawyerProfile.verified: False})
        db.commit()
        return {"success": True, "message": "Верификация всех юристов отозвана"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/maintenance/delete-seeded")
def delete_seeded_lawyers(user: User = require_role("admin"), db: Session = Depends(get_db)):
    """Delete all lawyer profiles generated during seed."""
    try:
        seeded_users = db.query(User).filter(User.phone.like("+77770002%")).all()
        count = len(seeded_users)
        for u in seeded_users:
            db.delete(u)
        db.commit()
        return {"success": True, "message": f"Успешно удалено {count} сгенерированных профилей юристов"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rag/search-test")
def test_rag_search(query: str, user: User = require_role("admin")):
    """Test vector RAG search similarity matching."""
    from services.rag_service import rag_service
    if not rag_service or not rag_service.collection:
        raise HTTPException(status_code=400, detail="ChromaDB не инициализирована")
    try:
        results = rag_service.collection.query(
            query_texts=[query],
            n_results=5
        )
        
        formatted_results = []
        if results and results.get('documents') and len(results['documents']) > 0:
            docs = results['documents'][0]
            metas = results['metadatas'][0] if results.get('metadatas') else [{} for _ in docs]
            distances = results['distances'][0] if results.get('distances') else [0.0 for _ in docs]
            ids = results['ids'][0] if results.get('ids') else [str(i) for i in range(len(docs))]
            
            for i in range(len(docs)):
                # Chroma distance: cosine distance is 0.0 to 2.0 (smaller is more similar)
                score = round(1.0 - distances[i], 3)
                formatted_results.append({
                    "id": ids[i],
                    "text": docs[i],
                    "metadata": metas[i],
                    "score": score
                })
        return formatted_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка поиска ChromaDB: {str(e)}")

# ── Dynamic System Settings Endpoints ──

class AdminSettingsResponse(BaseModel):
    maintenanceMode: bool
    activeRouting: str
    ragMinSimilarity: float
    llmTemperature: float

class UpdateAdminSettingsRequest(BaseModel):
    maintenanceMode: Optional[bool] = None
    activeRouting: Optional[str] = None
    ragMinSimilarity: Optional[float] = None
    llmTemperature: Optional[float] = None

@router.get("/settings", response_model=AdminSettingsResponse)
def get_admin_settings(user: User = require_role("admin")):
    """Get active system settings."""
    return {
        "maintenanceMode": getattr(settings, "MAINTENANCE_MODE", False),
        "activeRouting": getattr(settings, "LLM_PROVIDER", "gemini"),
        "ragMinSimilarity": getattr(settings, "RAG_MIN_SIMILARITY", 0.35),
        "llmTemperature": getattr(settings, "LLM_TEMPERATURE", 0.1)
    }

@router.post("/settings", response_model=AdminSettingsResponse)
def update_admin_settings(req: UpdateAdminSettingsRequest, user: User = require_role("admin")):
    """Update active system settings and persist to JSON."""
    if req.maintenanceMode is not None:
        settings.MAINTENANCE_MODE = req.maintenanceMode
    if req.activeRouting is not None:
        valid_providers = ("claude", "gemini", "groq")
        if req.activeRouting not in valid_providers:
            raise HTTPException(status_code=400, detail=f"Неверный провайдер: {req.activeRouting}. Допустимы: {valid_providers}")
        settings.LLM_PROVIDER = req.activeRouting
    if req.ragMinSimilarity is not None:
        if not (0.0 <= req.ragMinSimilarity <= 1.0):
            raise HTTPException(status_code=400, detail="ragMinSimilarity должен быть между 0.0 и 1.0")
        settings.RAG_MIN_SIMILARITY = req.ragMinSimilarity
    if req.llmTemperature is not None:
        if not (0.0 <= req.llmTemperature <= 1.0):
            raise HTTPException(status_code=400, detail="llmTemperature должен быть между 0.0 и 1.0")
        settings.LLM_TEMPERATURE = req.llmTemperature

    # Persist overrides to database/settings JSON file
    admin_settings_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db")
    os.makedirs(admin_settings_dir, exist_ok=True)
    admin_settings_path = os.path.join(admin_settings_dir, "admin_settings.json")
    try:
        import json
        with open(admin_settings_path, 'w', encoding='utf-8') as f:
            json.dump({
                "maintenanceMode": settings.MAINTENANCE_MODE,
                "activeRouting": settings.LLM_PROVIDER,
                "ragMinSimilarity": settings.RAG_MIN_SIMILARITY,
                "llmTemperature": settings.LLM_TEMPERATURE
            }, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to persist admin settings: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения настроек: {str(e)}")

    return {
        "maintenanceMode": settings.MAINTENANCE_MODE,
        "activeRouting": settings.LLM_PROVIDER,
        "ragMinSimilarity": settings.RAG_MIN_SIMILARITY,
        "llmTemperature": settings.LLM_TEMPERATURE
    }

