import sys, os
import json
import asyncio
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(__file__))
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')


# Setup test settings/DB environment
os.environ["DATABASE_URL"] = "sqlite:///./test_db.db"
os.environ["DEBUG_MODE"] = "true"
os.environ["JWT_SECRET"] = "test-secret-key-for-unit-tests-only-32chars"

from database import SessionLocal, init_db, Base
from models import ChatSession, ChatMessage, User
from services.agent_orchestrator import orchestrator

# Initialize DB tables
init_db()

async def simulate():
    db: Session = SessionLocal()
    
    # 1. Create a dummy user
    user = db.query(User).filter(User.phone == "+77777777777").first()
    if not user:
        user = User(name="Test User", phone="+77777777777", role="citizen", plan="freemium")
        db.add(user)
        db.commit()
        db.refresh(user)

    # 2. Create ChatSession
    session = ChatSession(user_id=user.id, title="Test Session")
    db.add(session)
    db.commit()
    db.refresh(session)
    
    session_id = session.id
    print(f"Created chat session: ID={session_id}")

    # Message 1
    content1 = "Привет! Как тебя зовут?"
    user_msg1 = ChatMessage(session_id=session_id, role="user", content=content1)
    db.add(user_msg1)
    db.commit()

    # Load history for Message 1
    prev_messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.id != user_msg1.id
    ).order_by(ChatMessage.created_at).all()
    history = [{"role": m.role, "content": m.content} for m in prev_messages]
    print(f"\nHistory before Message 1: {history}")

    # Simulate streaming response 1
    response1_parts = []
    async for chunk in orchestrator.process_chat_query_stream(content1, history, user_role=user.role, user_plan=user.plan, total_messages=0, db=db, user_id=user.id):
        response1_parts.append(chunk)
    response1 = "".join(response1_parts)
    print(f"Assistant Message 1 Response: {response1}")

    # Parse and save response 1
    from services.gemini_service import gemini_service
    parsed1 = gemini_service._parse_chat_response(response1)
    ai_msg1 = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=parsed1["content"]
    )
    db.add(ai_msg1)
    db.commit()
    print(f"Saved Assistant Message 1: {parsed1['content']}")

    # Message 2
    content2 = "Напиши еще раз как тебя зовут, чтобы проверить помнишь ли ты."
    user_msg2 = ChatMessage(session_id=session_id, role="user", content=content2)
    db.add(user_msg2)
    db.commit()

    # Load history for Message 2
    prev_messages2 = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.id != user_msg2.id
    ).order_by(ChatMessage.created_at).all()
    history2 = [{"role": m.role, "content": m.content} for m in prev_messages2]
    print(f"\nHistory before Message 2: {history2}")

    # Simulate streaming response 2
    response2_parts = []
    async for chunk in orchestrator.process_chat_query_stream(content2, history2, user_role=user.role, user_plan=user.plan, total_messages=2, db=db, user_id=user.id):
        response2_parts.append(chunk)
    response2 = "".join(response2_parts)
    print(f"Assistant Message 2 Response: {response2}")

    db.close()

if __name__ == "__main__":
    asyncio.run(simulate())
