import json
import os
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, ChatSession, ChatMessage
from schemas import CreateSessionRequest, SendMessageRequest, MessageResponse, SessionResponse
from auth import get_current_user
from services.gemini_service import gemini_service
from services.agent_orchestrator import orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


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
        query = query.filter(ChatSession.title.ilike(f"%{q}%"))
    sessions = query.order_by(ChatSession.updated_at.desc()).offset(skip).limit(limit).all()

    result = []
    for s in sessions:
        first_msg = db.query(ChatMessage).filter(ChatMessage.session_id == s.id, ChatMessage.role == "user").first()
        preview = first_msg.content[:80] if first_msg else None
        result.append(SessionResponse(id=s.id, title=s.title, segment=s.segment, created_at=s.created_at.isoformat(), updated_at=s.updated_at.isoformat(), preview=preview))
    return result


@router.post("/sessions/{session_id}/messages", response_model=MessageResponse)
async def send_message(session_id: int, req: SendMessageRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Send a message and get AI response."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_msg = ChatMessage(session_id=session_id, role="user", content=req.content)
    db.add(user_msg)
    db.commit()

    prev_messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()
    history = [{"role": m.role, "content": m.content} for m in prev_messages]

    ai_response = await orchestrator.process_chat_query(req.content, history, user_role=user.role)

    if ai_response.get("segment"):
        session.segment = ai_response["segment"]
    if len(prev_messages) <= 2:
        session.title = req.content[:60] + ("..." if len(req.content) > 60 else "")

    refs_json = json.dumps(ai_response.get("references", []), ensure_ascii=False) if ai_response.get("references") else None
    escalation_json = json.dumps(ai_response.get("escalation"), ensure_ascii=False) if ai_response.get("escalation") else None
    
    ai_msg = ChatMessage(session_id=session_id, role="assistant", content=ai_response["content"], segment=ai_response.get("segment"), references_json=refs_json, escalation_json=escalation_json)
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return MessageResponse(id=ai_msg.id, role="assistant", content=ai_msg.content, segment=ai_msg.segment, references=ai_response.get("references", []), escalation=ai_response.get("escalation"), timestamp=ai_msg.created_at.isoformat())


@router.post("/sessions/{session_id}/messages/stream")
async def stream_message(session_id: int, req: SendMessageRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Send a message and stream AI response via SSE."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_msg = ChatMessage(session_id=session_id, role="user", content=req.content)
    db.add(user_msg)
    db.commit()

    prev_messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()
    history = [{"role": m.role, "content": m.content} for m in prev_messages]

    if len(prev_messages) <= 2:
        session.segment = None
        session.title = req.content[:60] + ("..." if len(req.content) > 60 else "")
        db.commit()

    user_role = user.role

    async def generate():
        full_content = ""
        try:
            async for chunk in orchestrator.process_chat_query_stream(req.content, history, user_role=user_role):
                if not chunk:
                    continue
                full_content += chunk
                yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        # Parse the full response for refs/segment
        parsed = gemini_service._parse_chat_response(full_content)

        if parsed.get("segment"):
            session.segment = parsed["segment"]

        refs_json = json.dumps(parsed.get("references", []), ensure_ascii=False) if parsed.get("references") else None
        escalation_json = json.dumps(parsed.get("escalation"), ensure_ascii=False) if parsed.get("escalation") else None

        ai_msg = ChatMessage(session_id=session_id, role="assistant", content=parsed["content"], segment=parsed.get("segment"), references_json=refs_json, escalation_json=escalation_json)
        db.add(ai_msg)
        db.commit()
        db.refresh(ai_msg)

        yield f"data: {json.dumps({'done': True, 'id': ai_msg.id, 'segment': parsed.get('segment'), 'references': parsed.get('references', []), 'escalation': parsed.get('escalation'), 'content': parsed['content']}, ensure_ascii=False)}\n\n"

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

        result.append(MessageResponse(id=m.id, role=m.role, content=m.content, segment=m.segment, references=refs if refs else None, escalation=escalation, timestamp=m.created_at.isoformat()))
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
