import os
import json
import logging
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User, AuditResult
from schemas import AuditResponse, AuditHistoryItem
from services.gemini_service import gemini_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/audit", tags=["audit"])


def extract_text_from_file(file_path: str, filename: str) -> str:
    """Extract text from PDF, DOCX, or TXT files."""
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    elif ext == ".pdf":
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(file_path)
            return "".join(page.extract_text() or "" for page in reader.pages)
        except ImportError:
            raise HTTPException(status_code=500, detail="PyPDF2 not installed")
        except Exception as e:
            logger.error(f"PDF read error: {e}")
            raise HTTPException(status_code=400, detail=f"Ошибка чтения PDF: {str(e)}")
    elif ext in (".docx", ".doc"):
        try:
            from docx import Document as DocxDocument
            doc = DocxDocument(file_path)
            return "\n".join(p.text for p in doc.paragraphs)
        except ImportError:
            raise HTTPException(status_code=500, detail="python-docx not installed")
        except Exception as e:
            logger.error(f"DOCX read error: {e}")
            raise HTTPException(status_code=400, detail=f"Ошибка чтения DOCX: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail=f"Неподдерживаемый формат: {ext}")


@router.post("/analyze", response_model=AuditResponse)
async def analyze_contract(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Upload a contract and get AI audit analysis."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Файл не указан")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл превышает 10 МБ")

    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        contract_text = extract_text_from_file(tmp_path, file.filename)
        if not contract_text.strip():
            raise HTTPException(status_code=400, detail="Не удалось извлечь текст из документа")

        result = await gemini_service.audit_contract(contract_text)
        risks = result.get("risks", [])
        summary = result.get("summary", "Анализ завершён")
        total = result.get("totalRisks", len(risks))

        audit_record = AuditResult(user_id=user.id, filename=file.filename, risks_json=json.dumps(risks, ensure_ascii=False), summary=summary, total_risks=total)
        db.add(audit_record)
        db.commit()
        db.refresh(audit_record)

        return AuditResponse(id=audit_record.id, risks=risks, summary=summary, totalRisks=total)
    finally:
        os.unlink(tmp_path)


@router.get("/history", response_model=list[AuditHistoryItem])
def get_audit_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Get user's audit history with pagination."""
    audits = db.query(AuditResult).filter(AuditResult.user_id == user.id).order_by(AuditResult.created_at.desc()).offset(skip).limit(limit).all()
    return [AuditHistoryItem(id=a.id, filename=a.filename, summary=a.summary, total_risks=a.total_risks, created_at=a.created_at.isoformat()) for a in audits]


@router.get("/history/{audit_id}", response_model=AuditResponse)
def get_audit_detail(audit_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a specific audit result."""
    audit = db.query(AuditResult).filter(AuditResult.id == audit_id, AuditResult.user_id == user.id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    try:
        risks = json.loads(audit.risks_json) if audit.risks_json else []
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning(f"Failed to parse audit risks JSON: {e}")
        risks = []
    return AuditResponse(id=audit.id, risks=risks, summary=audit.summary or "", totalRisks=audit.total_risks)
