import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from schemas import CounterpartyCheckRequest, CounterpartyResult, CounterpartyHistoryItem
from auth import get_current_user
from models import User, CounterpartyCheck
from services.gemini_service import gemini_service

router = APIRouter(prefix="/api/counterparty", tags=["counterparty"])

CACHE_HOURS = 24


@router.post("/check", response_model=CounterpartyResult)
async def check_counterparty(req: CounterpartyCheckRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check a counterparty by BIN. Uses 24h cache."""
    if len(req.bin) != 12 or not req.bin.isdigit():
        raise HTTPException(status_code=400, detail="БИН должен содержать 12 цифр")

    # ── Check Plan Limits (DISABLED FOR MVP) ──
    # if user.plan == "freemium":
    #     total_checks = db.query(CounterpartyCheck).filter(CounterpartyCheck.user_id == user.id).count()
    #     if total_checks >= 1:
    #         raise HTTPException(status_code=403, detail="Лимит Freemium исчерпан (1 проверка БИН). Перейдите на тариф GO для расширенного доступа.")

    cache_cutoff = datetime.now(timezone.utc) - timedelta(hours=CACHE_HOURS)
    cached = db.query(CounterpartyCheck).filter(CounterpartyCheck.bin_number == req.bin, CounterpartyCheck.created_at >= cache_cutoff).order_by(CounterpartyCheck.created_at.desc()).first()

    if cached:
        return CounterpartyResult(**json.loads(cached.result_json))

    result = await gemini_service.check_counterparty(req.bin)

    check = CounterpartyCheck(user_id=user.id, bin_number=req.bin, company_name=result.get("companyName"), result_json=json.dumps(result, ensure_ascii=False), risk_level=result.get("riskLevel"))
    db.add(check)
    db.commit()

    return CounterpartyResult(**result)


@router.get("/history", response_model=list[CounterpartyHistoryItem])
def get_counterparty_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Get user's counterparty check history with pagination."""
    checks = db.query(CounterpartyCheck).filter(CounterpartyCheck.user_id == user.id).order_by(CounterpartyCheck.created_at.desc()).offset(skip).limit(limit).all()
    return [CounterpartyHistoryItem(id=c.id, bin_number=c.bin_number, company_name=c.company_name, risk_level=c.risk_level, created_at=c.created_at.isoformat()) for c in checks]


@router.get("/history/{check_id}", response_model=CounterpartyResult)
def get_counterparty_detail(check_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a specific counterparty check result."""
    check = db.query(CounterpartyCheck).filter(CounterpartyCheck.id == check_id, CounterpartyCheck.user_id == user.id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Проверка не найдена")
    return CounterpartyResult(**json.loads(check.result_json))
