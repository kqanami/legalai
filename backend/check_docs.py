from database import SessionLocal
from models import Document
from services.document_parser import extract_text
db = SessionLocal()
docs = db.query(Document).all()
for d in docs:
    text = extract_text(d.file_path)
    print(f"ID: {d.id}, Name: {d.name}, Path: {d.file_path}, Text length: {len(text)}")
