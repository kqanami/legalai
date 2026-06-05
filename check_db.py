import sys
sys.path.append('backend')
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import ChatMessage

engine = create_engine('postgresql://ai_legal:ai_legal_pass@localhost:5432/ai_legal_db')
Session = sessionmaker(bind=engine)
db = Session()

msgs = db.query(ChatMessage).order_by(ChatMessage.id.desc()).limit(1).all()
for m in msgs:
    print(m.id)
    print("references_json:", m.references_json)
