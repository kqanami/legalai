import json
import os
import uuid
import logging
import re
from fastapi import APIRouter, Depends, HTTPException, Query, Request, File, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, ChatSession, ChatMessage
from schemas import CreateSessionRequest, SendMessageRequest, MessageResponse, SessionResponse
from auth import get_current_user
from services.gemini_service import gemini_service
from services.agent_orchestrator import orchestrator
from services.document_parser import extract_text
from models import Document
from datetime import datetime, time, timezone
from sqlalchemy import func as sqla_func

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

# ── Server-side Lawyer Request Detector (Safety Net) ──
_LAWYER_KEYWORDS = [
    "дай адвоката", "найди адвоката", "найди юриста", "дай юриста",
    "мне нужен адвокат", "мне нужен юрист", "нужен адвокат", "нужен юрист",
    "свяжи с юристом", "свяжи с адвокатом", "помощь адвоката", "помощь юриста",
    "связать с адвокатом", "связать с юристом", "позови адвоката",
    "хочу адвоката", "хочу юриста", "нанять юриста", "нанять адвоката",
    "ищу адвоката", "ищу юриста", "подскажи адвоката", "подскажи юриста",
    "порекомендуй адвоката", "порекомендуй юриста", "консультация юриста",
    "очная консультация", "живой юрист", "живой адвокат",
]

def _detect_lawyer_request(user_text: str) -> dict | None:
    """Detects explicit lawyer/advocate requests from user message text."""
    text_lower = user_text.lower().strip()
    for kw in _LAWYER_KEYWORDS:
        if kw in text_lower:
            return {
                "needed": True,
                "reason": "Вы запросили помощь профессионального адвоката. Мы можем подобрать верифицированного специалиста из нашего маркетплейса.",
                "category": "Юридическая консультация"
            }
    return None


@router.post("/sessions", response_model=SessionResponse)
def create_session(req: CreateSessionRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new chat session."""
    session = ChatSession(user_id=user.id, title=req.title or "Новая консультация")
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionResponse(id=session.id, title=session.title, segment=session.segment, created_at=session.created_at.isoformat(), updated_at=session.updated_at.isoformat())


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of sessions to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max sessions to return"),
    q: str = Query(None, description="Search query for session titles"),
):
    """List chat sessions with pagination and search."""
    query = db.query(ChatSession).filter(ChatSession.user_id == user.id)
    if q:
        # Sanitize LIKE wildcards to prevent DoS
        safe_q = re.sub(r'[%_\\]', '', q)
        query = query.filter(ChatSession.title.ilike(f"%{safe_q}%"))
    sessions = query.order_by(ChatSession.updated_at.desc()).offset(skip).limit(limit).all()

    # Batch load first user message for each session (avoids N+1)
    session_ids = [s.id for s in sessions]
    from sqlalchemy import func as sqla_func
    first_msgs = {}
    if session_ids:
        subq = (
            db.query(ChatMessage.session_id, sqla_func.min(ChatMessage.id).label("min_id"))
            .filter(ChatMessage.session_id.in_(session_ids), ChatMessage.role == "user")
            .group_by(ChatMessage.session_id)
            .subquery()
        )
        msgs = db.query(ChatMessage).join(subq, ChatMessage.id == subq.c.min_id).all()
        for m in msgs:
            first_msgs[m.session_id] = m.content[:80]

    result = []
    for s in sessions:
        preview = first_msgs.get(s.id)
        result.append(SessionResponse(id=s.id, title=s.title, segment=s.segment, created_at=s.created_at.isoformat(), updated_at=s.updated_at.isoformat(), preview=preview))
    return result


@router.post("/sessions/{session_id}/messages", response_model=MessageResponse)
async def send_message(session_id: int, req: SendMessageRequest, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Send a message and get AI response."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ── Check Plan Limits (DISABLED FOR MVP) ──
    total_msgs = db.query(ChatMessage).join(ChatSession).filter(ChatSession.user_id == user.id, ChatMessage.role == "user").count()
    
    # if user.plan == "go":
    #     today_start = datetime.combine(datetime.now().date(), time.min).replace(tzinfo=timezone.utc)
    #     daily_msgs = db.query(ChatMessage).join(ChatSession).filter(
    #         ChatSession.user_id == user.id, 
    #         ChatMessage.role == "user",
    #         ChatMessage.created_at >= today_start
    #     ).count()
    #     if daily_msgs >= 50:
    #         raise HTTPException(status_code=403, detail="Дневной лимит (50 запросов) исчерпан.")

    user_msg = ChatMessage(
        session_id=session_id, 
        role="user", 
        content=req.content,
        attached_document_id=req.attached_document_id
    )
    db.add(user_msg)
    db.commit()

    prev_messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.id != user_msg.id
    ).order_by(ChatMessage.created_at).all()
    history = [{"role": m.role, "content": m.content} for m in prev_messages]

    # ── Document Context ──
    ai_query = req.content
    if getattr(req, "attached_document_id", None):
        doc = db.query(Document).filter(Document.id == req.attached_document_id, Document.user_id == user.id).first()
        if doc and os.path.exists(doc.file_path):
            doc_text = extract_text(doc.file_path)
            if doc_text:
                ai_query = f"[ВЛОЖЕННЫЙ ДОКУМЕНТ: {doc.name}]\n{doc_text[:15000]}\n\n[ЗАПРОС ПОЛЬЗОВАТЕЛЯ]: {req.content}"

    lang_header = request.headers.get("x-app-language")
    ai_response = await orchestrator.process_chat_query(ai_query, history, user_role=user.role, user_plan=user.plan, total_messages=total_msgs, db=db, user_id=user.id, forced_lang=lang_header, is_thinking_enabled=req.is_thinking_enabled)

    # Server-side escalation safety net: force escalation for explicit lawyer requests
    forced_esc = _detect_lawyer_request(req.content)
    if forced_esc and (not ai_response.get("escalation") or not ai_response["escalation"].get("needed")):
        ai_response["escalation"] = forced_esc

    if ai_response.get("segment"):
        session.segment = ai_response["segment"]
    if len(prev_messages) <= 2:
        session.title = req.content[:60] + ("..." if len(req.content) > 60 else "")

    refs_json = json.dumps(ai_response.get("references", []), ensure_ascii=False) if ai_response.get("references") else None
    escalation_json = json.dumps(ai_response.get("escalation"), ensure_ascii=False) if ai_response.get("escalation") else None
    suggestions_json = json.dumps(ai_response.get("suggestions", []), ensure_ascii=False) if ai_response.get("suggestions") else None
    
    ai_msg = ChatMessage(
        session_id=session_id, 
        role="assistant", 
        content=ai_response["content"], 
        segment=ai_response.get("segment"), 
        references_json=refs_json, 
        escalation_json=escalation_json,
        suggestions_json=suggestions_json
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return MessageResponse(
        id=ai_msg.id, 
        role="assistant", 
        content=ai_msg.content, 
        segment=ai_msg.segment, 
        references=ai_response.get("references", []), 
        escalation=ai_response.get("escalation"), 
        suggestions=ai_response.get("suggestions"), 
        attached_document_id=ai_msg.attached_document_id,
        timestamp=ai_msg.created_at.isoformat()
    )


@router.post("/sessions/{session_id}/messages/stream")
async def stream_message(session_id: int, req: SendMessageRequest, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Send a message and stream AI response via SSE."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ── Check Plan Limits (Streaming) (DISABLED FOR MVP) ──
    total_msgs = db.query(ChatMessage).join(ChatSession).filter(ChatSession.user_id == user.id, ChatMessage.role == "user").count()
    
    # if user.plan == "go":
    #     today_start = datetime.combine(datetime.now().date(), time.min).replace(tzinfo=timezone.utc)
    #     daily_msgs = db.query(ChatMessage).join(ChatSession).filter(
    #         ChatSession.user_id == user.id, 
    #         ChatMessage.role == "user",
    #         ChatMessage.created_at >= today_start
    #     ).count()
    #     if daily_msgs >= 50:
    #         raise HTTPException(status_code=403, detail="Дневной лимит (50 запросов) исчерпан.")

    user_msg = ChatMessage(
        session_id=session_id, 
        role="user", 
        content=req.content,
        attached_document_id=req.attached_document_id
    )
    db.add(user_msg)
    db.commit()

    prev_messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.id != user_msg.id
    ).order_by(ChatMessage.created_at).all()
    history = [{"role": m.role, "content": m.content} for m in prev_messages]

    if len(prev_messages) <= 2:
        session.segment = None
        session.title = req.content[:60] + ("..." if len(req.content) > 60 else "")
        db.commit()

    user_role = user.role
    user_plan = user.plan

    # ── Document Context ──
    ai_query = req.content
    if getattr(req, "attached_document_id", None):
        doc = db.query(Document).filter(Document.id == req.attached_document_id, Document.user_id == user.id).first()
        if doc and os.path.exists(doc.file_path):
            doc_text = extract_text(doc.file_path)
            if doc_text:
                ai_query = f"[ВЛОЖЕННЫЙ ДОКУМЕНТ: {doc.name}]\n{doc_text[:15000]}\n\n[ЗАПРОС ПОЛЬЗОВАТЕЛЯ]: {req.content}"

    async def generate():
        full_content = ""
        try:
            lang_header = request.headers.get("x-app-language")
            async for chunk in orchestrator.process_chat_query_stream(ai_query, history, user_role=user_role, user_plan=user_plan, total_messages=total_msgs, db=db, user_id=user.id, forced_lang=lang_header, is_thinking_enabled=req.is_thinking_enabled):
                if not chunk:
                    continue
                full_content += chunk
                yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        # Parse the full response for refs/segment
        parsed = gemini_service._parse_chat_response(full_content)

        # Server-side escalation safety net for streaming
        forced_esc = _detect_lawyer_request(req.content)
        if forced_esc and (not parsed.get("escalation") or not parsed["escalation"].get("needed")):
            parsed["escalation"] = forced_esc

        if parsed.get("segment"):
            session.segment = parsed["segment"]

        refs_json = json.dumps(parsed.get("references", []), ensure_ascii=False) if parsed.get("references") else None
        escalation_json = json.dumps(parsed.get("escalation"), ensure_ascii=False) if parsed.get("escalation") else None
        suggestions_json = json.dumps(parsed.get("suggestions", []), ensure_ascii=False) if parsed.get("suggestions") else None

        ai_msg = ChatMessage(
            session_id=session_id, 
            role="assistant", 
            content=parsed["content"], 
            segment=parsed.get("segment"), 
            references_json=refs_json, 
            escalation_json=escalation_json,
            suggestions_json=suggestions_json
        )
        db.add(ai_msg)
        db.commit()
        db.refresh(ai_msg)

        yield f"data: {json.dumps({'done': True, 'id': ai_msg.id, 'segment': parsed.get('segment'), 'references': parsed.get('references', []), 'escalation': parsed.get('escalation'), 'suggestions': parsed.get('suggestions', []), 'content': parsed['content']}, ensure_ascii=False)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
def get_messages(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all messages in a chat session."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()
    result = []
    for m in messages:
        refs = []
        if m.references_json:
            try:
                refs = json.loads(m.references_json)
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Failed to parse refs for message {m.id}: {e}")
                
        escalation = None
        if m.escalation_json:
            try:
                escalation = json.loads(m.escalation_json)
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Failed to parse escalation for message {m.id}: {e}")

        suggestions = []
        if m.suggestions_json:
            try:
                suggestions = json.loads(m.suggestions_json)
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Failed to parse suggestions for message {m.id}: {e}")

        doc_name = None
        if m.attached_document_id:
            doc = db.query(Document).filter(Document.id == m.attached_document_id).first()
            if doc:
                doc_name = doc.name

        result.append(MessageResponse(
            id=m.id, 
            role=m.role, 
            content=m.content, 
            segment=m.segment, 
            references=refs if refs else None, 
            escalation=escalation, 
            suggestions=suggestions if suggestions else None,
            attached_document_id=m.attached_document_id,
            attached_document_name=doc_name,
            timestamp=m.created_at.isoformat()
        ))
    return result


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a chat session and all its messages."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"success": True}


@router.post("/sessions/{session_id}/export")
def export_session(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Export chat session as a DOCX document."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()
    if not messages:
        raise HTTPException(status_code=400, detail="Нет сообщений для экспорта")

    lines = [f"# Консультация: {session.title}", "", f"**Дата**: {session.created_at.strftime('%d.%m.%Y %H:%M')}", f"**Сегмент**: {session.segment or 'Не определён'}", "", "---", ""]
    for m in messages:
        sender = "Пользователь" if m.role == "user" else "AI-Юрист"
        lines.extend([f"### {sender}", f"*{m.created_at.strftime('%H:%M')}*", "", m.content, ""])
        if m.references_json:
            try:
                refs = json.loads(m.references_json)
                if refs:
                    lines.append("**Источники:**")
                    for r in refs:
                        lines.append(f"- [{r.get('title', 'Закон')}]({r.get('url', '#')}) — {r.get('articles', '')}")
                    lines.append("")
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Failed to parse refs for export: {e}")
        lines.extend(["---", ""])

    from config import settings
    from services.document_builder import document_builder
    filename = f"chat_export_{uuid.uuid4().hex[:8]}.docx"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    document_builder.build_docx("\n".join(lines), filepath)

    return FileResponse(path=filepath, filename=f"Консультация_{session.title[:30]}.docx", media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    """Transcribe uploaded audio recording (WebM/WAV) using Groq Whisper."""
    try:
        from config import settings
        # Generate temporary file path
        ext = os.path.splitext(file.filename)[1] if file.filename else ".webm"
        if not ext:
            ext = ".webm"
        filename = f"transcribe_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        
        # Ensure upload dir exists
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)
            
        try:
            text = gemini_service.transcribe_audio(filepath)
            return {"text": text}
        finally:
            # Clean up temp file
            if os.path.exists(filepath):
                os.remove(filepath)
    except Exception as e:
        logger.error(f"Audio transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
