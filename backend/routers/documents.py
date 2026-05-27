import os
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, Document
from schemas import DocumentResponse, GenerateDocRequest
from auth import get_current_user
from config import settings
from services.gemini_service import gemini_service
from pydantic import BaseModel

class SaveDocRequest(BaseModel):
    name: str
    content: str

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["documents"])



async def run_auto_audit(doc_id: int, user_id: int, file_path: str, original_filename: str):
    from database import SessionLocal
    from routers.audit import extract_text_from_file, classify_document
    from services.agent_orchestrator import orchestrator
    from models import AuditResult
    import json
    
    db = SessionLocal()
    try:
        contract_text = extract_text_from_file(file_path, original_filename)
        if not contract_text.strip():
            return
            
        doc_type = classify_document(contract_text)
        if doc_type == "personal":
            risks = []
            summary = "Данный документ не является юридическим договором или правовым документом. Аудит рисков не применим. Вы можете использовать чат для вопросов по этому документу."
            total_risks = 0
            logger.info(f"Document {doc_id} classified as personal — skipping auto-audit.")
        else:
            result = await orchestrator.process_contract_audit(contract_text, doc_type)
            risks = result.get("risks", [])
            summary = result.get("summary", "")
            total_risks = result.get("totalRisks", len(risks))
        
        audit_record = AuditResult(
            user_id=user_id,
            document_id=doc_id,
            filename=original_filename,
            original_text=contract_text,
            risks_json=json.dumps(risks, ensure_ascii=False),
            summary=summary,
            total_risks=total_risks
        )
        db.add(audit_record)
        db.commit()
    except Exception as e:
        logger.error(f"Auto-audit background task failed: {e}")
    finally:
        db.close()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db), background_tasks: BackgroundTasks = None):
    """Upload a document (PDF, DOCX, DOC, TXT)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    allowed_types = [".pdf", ".docx", ".doc", ".txt"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Allowed: {', '.join(allowed_types)}")

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit")

    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(user_id=user.id, name=file.filename, original_filename=file.filename, file_path=file_path, file_size=len(content), doc_type="uploaded", mime_type=file.content_type)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    if background_tasks:
        background_tasks.add_task(run_auto_audit, doc.id, user.id, doc.file_path, doc.original_filename)

    return DocumentResponse(id=doc.id, name=doc.name, original_filename=doc.original_filename, file_size=doc.file_size, doc_type=doc.doc_type, created_at=doc.created_at.isoformat())


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    q: str = Query(None, description="Search by document name"),
):
    """List all documents with pagination and search."""
    query = db.query(Document).filter(Document.user_id == user.id)
    if q:
        query = query.filter(Document.name.ilike(f"%{q}%"))
    docs = query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()
    return [DocumentResponse(id=d.id, name=d.name, original_filename=d.original_filename, file_size=d.file_size, doc_type=d.doc_type, created_at=d.created_at.isoformat()) for d in docs]


@router.get("/{doc_id}/download")
def download_document(doc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Download a document."""
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(path=doc.file_path, filename=doc.original_filename, media_type=doc.mime_type or "application/octet-stream")


@router.delete("/{doc_id}")
def delete_document(doc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a document."""
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    
    from models import AuditResult
    db.query(AuditResult).filter(AuditResult.document_id == doc.id).delete()
    
    db.delete(doc)
    db.commit()
    return {"success": True}


@router.get("/{doc_id}/content")
def get_document_content(doc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Extract and return text content of a document."""
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    from routers.audit import extract_text_from_file
    try:
        content = extract_text_from_file(doc.file_path, doc.original_filename)
        return {"id": doc.id, "content": content}
    except Exception as e:
        logger.error(f"Failed to extract content: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract document text")


@router.post("/generate")
async def generate_document(req: GenerateDocRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db), background_tasks: BackgroundTasks = None):
    """Generate a legal document using AI."""
    doc_content = await gemini_service.generate_document(req.doc_type, req.description)

    unique_name = f"generated_{uuid.uuid4().hex[:8]}.docx"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    from services.document_builder import document_builder
    document_builder.build_docx(doc_content, file_path)

    display_names = {"claim": "Исковое заявление", "complaint": "Жалоба / Претензия", "contract": "Договор", "statement": "Заявление"}
    display_name = display_names.get(req.doc_type, "Документ") + f" — {req.description[:40]}"

    doc = Document(user_id=user.id, name=display_name, original_filename=unique_name, file_path=file_path, file_size=os.path.getsize(file_path), doc_type="generated", mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    db.add(doc)
    db.commit()
    db.refresh(doc)
    if background_tasks:
        background_tasks.add_task(run_auto_audit, doc.id, user.id, doc.file_path, doc.original_filename)

    return {"id": doc.id, "name": doc.name, "content": doc_content, "doc_type": "generated"}


@router.post("/save-fixed")
async def save_fixed_document(req: SaveDocRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Save a fixed contract markdown as a DOCX file directly, without using LLM."""
    unique_name = f"fixed_{uuid.uuid4().hex[:8]}.docx"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    from services.document_builder import document_builder
    document_builder.build_docx(req.content, file_path)

    doc = Document(
        user_id=user.id,
        name=req.name,
        original_filename=unique_name,
        file_path=file_path,
        file_size=os.path.getsize(file_path),
        doc_type="generated",
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {"id": doc.id, "name": doc.name}
