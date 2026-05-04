from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, ChatSession, ChatMessage, Document, CounterpartyCheck, AuditResult
from schemas import DashboardStats, SessionResponse
from auth import get_current_user

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=DashboardStats)
def get_dashboard_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get dashboard statistics for the current user."""
    total_chats = db.query(ChatSession).filter(ChatSession.user_id == user.id).count()
    total_messages = (
        db.query(ChatMessage)
        .join(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .count()
    )
    total_documents = db.query(Document).filter(Document.user_id == user.id).count()
    total_counterparty = db.query(CounterpartyCheck).filter(CounterpartyCheck.user_id == user.id).count()
    total_audits = db.query(AuditResult).filter(AuditResult.user_id == user.id).count()

    # Recent sessions (last 5)
    recent = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc())
        .limit(5)
        .all()
    )
    recent_sessions = []
    for s in recent:
        first_msg = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == s.id, ChatMessage.role == "user")
            .first()
        )
        recent_sessions.append(SessionResponse(
            id=s.id,
            title=s.title,
            segment=s.segment,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
            preview=first_msg.content[:80] if first_msg else None,
        ))

    return DashboardStats(
        total_chats=total_chats,
        total_messages=total_messages,
        total_documents=total_documents,
        total_counterparty_checks=total_counterparty,
        total_audits=total_audits,
        recent_sessions=recent_sessions,
    )
