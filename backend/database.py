from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite specific
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    try:
        with engine.begin() as conn:
            try: conn.exec_driver_sql("ALTER TABLE users ADD COLUMN city VARCHAR;")
            except Exception: pass
            
            try: conn.exec_driver_sql("ALTER TABLE lawyer_profiles ADD COLUMN cases_total INTEGER DEFAULT 0;")
            except Exception: pass
            
            try: conn.exec_driver_sql("ALTER TABLE lawyer_profiles ADD COLUMN city VARCHAR;")
            except Exception: pass
            
            try: conn.exec_driver_sql("ALTER TABLE lawyer_profiles ADD COLUMN experience_years INTEGER DEFAULT 0;")
            except Exception: pass
            
            try: conn.exec_driver_sql("ALTER TABLE lawyer_profiles ADD COLUMN is_accepting_clients BOOLEAN DEFAULT 1;")
            except Exception: pass
            
            try: conn.exec_driver_sql("ALTER TABLE lawyer_profiles ADD COLUMN response_time_hours FLOAT DEFAULT 0.0;")
            except Exception: pass
            
            try: conn.exec_driver_sql("ALTER TABLE lawyer_profiles ADD COLUMN photo_url VARCHAR;")
            except Exception: pass
            
            try: conn.exec_driver_sql("ALTER TABLE lawyer_profiles ADD COLUMN hourly_rate INTEGER DEFAULT 0;")
            except Exception: pass
            
            # ChatMessage updates
            try: conn.exec_driver_sql("ALTER TABLE chat_messages ADD COLUMN references_json TEXT;")
            except Exception: pass
            try: conn.exec_driver_sql("ALTER TABLE chat_messages ADD COLUMN escalation_json TEXT;")
            except Exception: pass
            
            # AuditResult updates
            try: conn.exec_driver_sql("ALTER TABLE audit_results ADD COLUMN original_text TEXT;")
            except Exception: pass
            
            # Client updates
            try: conn.exec_driver_sql("ALTER TABLE clients ADD COLUMN user_id INTEGER;")
            except Exception: pass
            try: conn.exec_driver_sql("ALTER TABLE clients ADD COLUMN source VARCHAR DEFAULT 'manual';")
            except Exception: pass
            
            # EscalationRequest updates
            try: conn.exec_driver_sql("ALTER TABLE escalation_requests ADD COLUMN lawyer_id INTEGER;")
            except Exception: pass
            try: conn.exec_driver_sql("ALTER TABLE escalation_requests ADD COLUMN ai_analysis TEXT;")
            except Exception: pass
            
            # Case updates
            try: conn.exec_driver_sql("ALTER TABLE cases ADD COLUMN court_case_number VARCHAR;")
            except Exception: pass
            try: conn.exec_driver_sql("ALTER TABLE cases ADD COLUMN category VARCHAR;")
            except Exception: pass
            try: conn.exec_driver_sql("ALTER TABLE cases ADD COLUMN closed_at DATETIME;")
            except Exception: pass
    except Exception as e:
        print("Schema update error:", e)
