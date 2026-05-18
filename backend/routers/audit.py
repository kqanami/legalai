import os
import json
import logging
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User, AuditResult
from schemas import AuditResponse, AuditHistoryItem, ReanalyzeRequest, SaveTextRequest
from services.gemini_service import gemini_service
from services.agent_orchestrator import orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/audit", tags=["audit"])


def sanitize_extracted_doc_text(text: str) -> str:
    """Cleans OLE headers, font names, style lists, and binary remnants from legacy .doc files."""
    if not text:
        return ""
        
    import re
    
    # 1. Keep ONLY standard Russian and Kazakh Cyrillic letters, Latin letters, digits, whitespace, and basic punctuation.
    # This completely filters out rare Serbian/Belarusian garbage characters (like Ў, ў, ћ, њ, ђ, ј) resulting from raw bytes decoding!
    # Allowed Cyrillic: Russian (а-яА-ЯёЁ) + Kazakh (ӘәҒғҚқҢңӨөҰұҮүҺһІі)
    allowed_pattern = re.compile(
        r'[^\u0410-\u044F\u0401\u0451'  # Russian а-я А-Я ё Ё
        r'\u04D8\u04D9\u0492\u0493\u049A\u049B\u04A2\u04A3\u04E8\u04E9\u04B0\u04B1\u04AE\u04AF\u04BA\u04BB\u0406\u0456'  # Kazakh ӘәҒғҚқҢңӨөҰұҮүҺһІі
        r'a-zA-Z0-9\s\.,!?;:()\"\'\-\/\\@\=\+\*\#\_\%]+'  # Latin, digits, spacing, punctuation
    )
    cleaned_text = allowed_pattern.sub('', text)
    
    # 2. Process line by line
    lines = cleaned_text.splitlines()
    filtered_lines = []
    
    # Structural keywords to completely skip (case-insensitive)
    metadata_keywords = {
        "times new roman", "calibri", "arial", "courier new", "symbol", "tahoma", "verdana", "georgia",
        "root entry", "worddocument", "summaryinformation", "documentsummaryinformation", "compobj", "objectpool",
        "table", "data", "macros", "templates", "normalthtd", "normaldot",
        "msworddoc", "microsoft word", "word document", "garantplus", "acp-usr", "garant"
    }
    
    # Style names to skip when they appear alone
    style_names = {"обычный", "строгий", "гиперссылка", "заголовок", "обычный веб", "обычныйвеб"}
    
    for line in lines:
        line_strip = line.strip()
        if not line_strip:
            continue
            
        line_lower = line_strip.lower()
        
        # Skip if line contains raw OLE metadata tags
        if any(keyword in line_lower for keyword in metadata_keywords):
            continue
            
        # Skip pure style names
        if line_lower in style_names:
            continue
            
        # Rule A: Detect repeated letters (e.g. яяяя, OOOO, SSSSS)
        # Any letter repeated 4 or more times consecutively is a clear sign of binary padding/garbage
        if re.search(r'([a-zA-Z\u0400-\u04FF])\1{3,}', line_strip):
            continue
            
        # Rule B: Word-level validation (split by space/punctuation/non-alphabetic characters)
        words = re.findall(r'[a-zA-Z\u0400-\u04FF\u04D8\u04D9\u0492\u0493\u049A\u049B\u04A2\u04A3\u04E8\u04E9\u04B0\u04B1\u04AE\u04AF\u04BA\u04BB\u0406\u0456]+', line_strip)
        is_junk_line = False
        
        for word in words:
            # Skip words longer than 22 characters (highly unlikely to be real Russian/Kazakh words)
            if len(word) > 22:
                is_junk_line = True
                break
                
            # If a word mixes Latin and Cyrillic (e.g. agd2щ or ЧивjЪtЯ), it is 100% binary residue!
            has_latin = bool(re.search(r'[a-zA-Z]', word))
            has_cyrillic = bool(re.search(r'[\u0400-\u04FF\u04D8-\u04DF\u04E8-\u04E9\u04B0-\u04B1\u04AE-\u04AF\u04BA-\u04BB\u0406\u0456]', word))
            if has_latin and has_cyrillic:
                is_junk_line = True
                break
                
            # If a word has strange mixed case patterns in the middle (like JmH or JCJ or фефеТе)
            if len(word) > 3 and re.search(r'[a-z\u0430-\u044F\u0451\u04D9\u0493\u049B\u04A3\u04E9\u04B1\u04AF\u04BB\u0456][A-Z\u0410-\u042F\u04D8\u0492\u049A\u04A2\u04E8\u04B0\u04AE\u04BA\u0406]', word):
                is_junk_line = True
                break
                
            # A word cannot start with multiple uppercase letters followed by lowercase (like РПабюя)
            if len(word) > 3 and re.search(r'^[A-Z\u0410-\u042F\u04D8\u0492\u049A\u04A2\u04E8\u04B0\u04AE\u04BA\u0406]{2,}[a-z\u0430-\u044F\u0451\u04D9\u0493\u049B\u04A3\u04E9\u04B1\u04AF\u04BB\u0456]', word):
                is_junk_line = True
                break

        if is_junk_line:
            continue
            
        # Extract letters only to verify content density
        letters = re.findall(r'[a-zA-Z\u0400-\u04FF\u04D8\u04D9\u0492\u0493\u049A\u049B\u04A2\u04A3\u04E8\u04E9\u04B0\u04B1\u04AE\u04AF\u04BA\u04BB\u0406\u0456]', line_strip)
        if not letters:
            continue
            
        # Rule C: If the line has very few letters compared to length, it is likely structural residue
        letter_ratio = len(letters) / len(line_strip)
        if len(line_strip) > 12 and letter_ratio < 0.45:
            continue
            
        # Skip random short binary noise
        if len(line_strip) < 4:
            continue
            
        filtered_lines.append(line_strip)
        
    result_text = "\n".join(filtered_lines)
    
    # Post-process: collapse excessive newlines and double spaces
    result_text = re.sub(r'\n{3,}', '\n\n', result_text)
    result_text = re.sub(r' {2,}', ' ', result_text)
    
    return result_text.strip()


def extract_text_from_binary_doc(file_path: str) -> str:
    """Fallback text extractor for legacy binary .doc files using olefile and raw bytes fallbacks."""
    try:
        import olefile
        import re
        
        raw_text = ""
        
        # 1. Try proper OLE parsing using olefile
        if olefile.isOleFile(file_path):
            try:
                with olefile.OleFileIO(file_path) as ole:
                    # The text is primarily stored in the 'WordDocument' stream.
                    if ole.exists("WordDocument"):
                        with ole.openstream("WordDocument") as stream:
                            data = stream.read()
                            
                        # Decode with both utf-16-le and cp1251
                        utf16_text = data.decode("utf-16-le", errors="ignore")
                        cp1251_text = data.decode("cp1251", errors="ignore")
                        
                        # Count actual Cyrillic letters to determine correct encoding
                        cyrillic_pattern = re.compile(
                            r'[\u0410-\u044F\u0401\u0451'  # Russian
                            r'\u04D8\u04D9\u0492\u0493\u049A\u049B\u04A2\u04A3\u04E8\u04E9\u04B0\u04B1\u04AE\u04AF\u04BA\u04BB\u0406\u0456]' # Kazakh
                        )
                        utf16_cy_count = len(cyrillic_pattern.findall(utf16_text))
                        cp1251_cy_count = len(cyrillic_pattern.findall(cp1251_text))
                        
                        logger.info(f"OLE WordDocument decoded: UTF-16-LE Cyrillic count = {utf16_cy_count}, CP1251 Cyrillic count = {cp1251_cy_count}")
                        
                        if utf16_cy_count >= cp1251_cy_count and utf16_cy_count > 0:
                            raw_text = utf16_text
                        elif cp1251_cy_count > 0:
                            raw_text = cp1251_text
                        else:
                            # Fallback if no Cyrillic found (e.g. English document)
                            raw_text = utf16_text if len(utf16_text) > len(cp1251_text) else cp1251_text
            except Exception as ole_err:
                logger.error(f"OLE parser failed to extract WordDocument stream: {ole_err}")
                
        # 2. Fallback to raw binary regex-based decoding if OLE parsing failed or found no text
        if not raw_text.strip():
            logger.info("Falling back to raw byte-level decoding...")
            with open(file_path, "rb") as f:
                data = f.read()
            
            utf16_text = data.decode("utf-16-le", errors="ignore")
            cp1251_text = data.decode("cp1251", errors="ignore")
            
            cyrillic_pattern = re.compile(
                r'[\u0410-\u044F\u0401\u0451'
                r'\u04D8\u04D9\u0492\u0493\u049A\u049B\u04A2\u04A3\u04E8\u04E9\u04B0\u04B1\u04AE\u04AF\u04BA\u04BB\u0406\u0456]'
            )
            utf16_cy_count = len(cyrillic_pattern.findall(utf16_text))
            cp1251_cy_count = len(cyrillic_pattern.findall(cp1251_text))
            
            if utf16_cy_count >= cp1251_cy_count and utf16_cy_count > 0:
                raw_text = utf16_text
            else:
                raw_text = cp1251_text
                
        # Clean and sanitize the document text perfectly
        sanitized = sanitize_extracted_doc_text(raw_text)
        return sanitized
    except Exception as e:
        logger.error(f"Binary DOC extraction failed: {e}")
        return ""


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
            logger.info(f"python-docx failed to read file. Trying binary extraction fallback. Error: {e}")
            binary_text = extract_text_from_binary_doc(file_path)
            if binary_text.strip():
                return binary_text
            
            raise HTTPException(
                status_code=400,
                detail="Не удалось прочитать документ Word. Пожалуйста, сохраните его в формате .docx (Документ Word) и загрузите повторно."
            )
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

    # Diagnostic Copy: Save a copy of the file for binary inspection
    try:
        import shutil
        shutil.copy2(tmp_path, "/app/debug_uploaded_file.doc")
        logger.info("Saved diagnostic copy to /app/debug_uploaded_file.doc")
    except Exception as copy_err:
        logger.warning(f"Failed to save diagnostic copy: {copy_err}")

    try:
        contract_text = extract_text_from_file(tmp_path, file.filename)
        if not contract_text.strip():
            raise HTTPException(status_code=400, detail="Не удалось извлечь текст из документа")

        result = await orchestrator.process_contract_audit(contract_text)
        risks = result.get("risks", [])
        summary = result.get("summary", "Анализ завершён")
        total = result.get("totalRisks", len(risks))

        audit_record = AuditResult(
            user_id=user.id,
            filename=file.filename,
            original_text=contract_text,
            risks_json=json.dumps(risks, ensure_ascii=False),
            summary=summary,
            total_risks=total
        )
        db.add(audit_record)
        db.commit()
        db.refresh(audit_record)

        return AuditResponse(
            id=audit_record.id,
            risks=risks,
            summary=summary,
            totalRisks=total,
            original_text=contract_text
        )
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
    return AuditResponse(
        id=audit.id,
        risks=risks,
        summary=audit.summary or "",
        totalRisks=audit.total_risks,
        original_text=audit.original_text
    )


@router.delete("/history")
def delete_all_audit_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete all audit history items for the current user."""
    db.query(AuditResult).filter(AuditResult.user_id == user.id).delete()
    db.commit()
    return {"status": "success", "message": "Вся история анализов успешно удалена"}


@router.delete("/history/{audit_id}")
def delete_audit_history_item(audit_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a specific audit history item."""
    audit = db.query(AuditResult).filter(AuditResult.id == audit_id, AuditResult.user_id == user.id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    db.delete(audit)
    db.commit()
    return {"status": "success", "message": "Анализ успешно удалён"}


@router.post("/reanalyze", response_model=AuditResponse)
async def reanalyze_contract_text(req: ReanalyzeRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Re-run AI audit analysis on manually edited contract text, saving it to the database."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Текст документа пуст")

    result = await orchestrator.process_contract_audit(req.text)
    risks = result.get("risks", [])
    summary = result.get("summary", "Анализ завершён")
    total = result.get("totalRisks", len(risks))

    if req.audit_id:
        # Update existing record
        audit_record = db.query(AuditResult).filter(AuditResult.id == req.audit_id, AuditResult.user_id == user.id).first()
        if audit_record:
            audit_record.original_text = req.text
            audit_record.risks_json = json.dumps(risks, ensure_ascii=False)
            audit_record.summary = summary
            audit_record.total_risks = total
            db.commit()
            db.refresh(audit_record)
        else:
            # Fallback to creating new
            audit_record = AuditResult(
                user_id=user.id,
                filename=req.filename or "Редактированный документ.docx",
                original_text=req.text,
                risks_json=json.dumps(risks, ensure_ascii=False),
                summary=summary,
                total_risks=total
            )
            db.add(audit_record)
            db.commit()
            db.refresh(audit_record)
    else:
        # Create a new record
        audit_record = AuditResult(
            user_id=user.id,
            filename=req.filename or "Редактированный документ.docx",
            original_text=req.text,
            risks_json=json.dumps(risks, ensure_ascii=False),
            summary=summary,
            total_risks=total
        )
        db.add(audit_record)
        db.commit()
        db.refresh(audit_record)

    return AuditResponse(
        id=audit_record.id,
        risks=risks,
        summary=summary,
        totalRisks=total,
        original_text=audit_record.original_text
    )


@router.put("/history/{audit_id}")
def save_edited_contract_text(audit_id: int, req: SaveTextRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Save manually edited contract text for a specific audit history item."""
    audit = db.query(AuditResult).filter(AuditResult.id == audit_id, AuditResult.user_id == user.id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Анализ не найден")
    audit.original_text = req.text
    db.commit()
    return {"status": "success", "message": "Правки успешно сохранены"}
