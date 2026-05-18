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
