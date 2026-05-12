from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, Table
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base
import enum


class UserRole(str, enum.Enum):
    citizen = "citizen"
    business = "business"
    lawyer = "lawyer"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True)
    role = Column(String(20), default="citizen")
    city = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    counterparty_checks = relationship("CounterpartyCheck", back_populates="user", cascade="all, delete-orphan")
    audit_results = relationship("AuditResult", back_populates="user", cascade="all, delete-orphan")
    escalation_requests = relationship("EscalationRequest", back_populates="user", cascade="all, delete-orphan")
    reviews_given = relationship("ClientReview", back_populates="reviewer", cascade="all, delete-orphan")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), default="Новая консультация")
    segment = Column(String(10), nullable=True)  # b2c / b2b
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    segment = Column(String(10), nullable=True)
    references_json = Column(Text, nullable=True)  # JSON string of references
    escalation_json = Column(Text, nullable=True)  # JSON escalation data from AI
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("ChatSession", back_populates="messages")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, default=0)
    doc_type = Column(String(20), default="uploaded")  # "uploaded" or "generated"
    mime_type = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="documents")


class CounterpartyCheck(Base):
    """Cached counterparty check results."""
    __tablename__ = "counterparty_checks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bin_number = Column(String(12), nullable=False, index=True)
    company_name = Column(String(500), nullable=True)
    result_json = Column(Text, nullable=False)  # Full JSON result
    risk_level = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="counterparty_checks")


class AuditResult(Base):
    """Persisted audit results."""
    __tablename__ = "audit_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    risks_json = Column(Text, nullable=False)  # JSON array of risks
    summary = Column(Text, nullable=True)
    total_risks = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="audit_results")


# ── Lawyer Workspace Models ──

# Many-to-many: LawyerProfile <-> Specialization categories
lawyer_specializations = Table(
    "lawyer_specializations",
    Base.metadata,
    Column("lawyer_id", Integer, ForeignKey("lawyer_profiles.id"), primary_key=True),
    Column("specialization_id", Integer, ForeignKey("specialization_categories.id"), primary_key=True),
)


class SpecializationCategory(Base):
    """Pre-defined legal specialization categories."""
    __tablename__ = "specialization_categories"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)  # e.g. "labor", "family", "criminal"
    name_ru = Column(String(255), nullable=False)  # "Трудовое право"
    name_kz = Column(String(255), nullable=True)   # "Еңбек құқығы"
    icon = Column(String(10), nullable=True)        # emoji: ⚖️

    lawyers = relationship("LawyerProfile", secondary=lawyer_specializations, back_populates="specializations")


class LawyerProfile(Base):
    __tablename__ = "lawyer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    iin = Column(String(12), nullable=False, index=True)
    license_number = Column(String(255), nullable=False)
    specialization = Column(String(255), nullable=False)  # Legacy text field
    verified = Column(Boolean, default=False)
    bio = Column(Text, nullable=True)
    rating = Column(Float, default=5.0)
    cases_won = Column(Integer, default=0)
    cases_total = Column(Integer, default=0)
    city = Column(String(100), nullable=True)
    photo_url = Column(String(500), nullable=True)
    experience_years = Column(Integer, default=0)
    hourly_rate = Column(Integer, default=0)
    is_accepting_clients = Column(Boolean, default=True)
    response_time_hours = Column(Float, nullable=True)  # Average response time

    user = relationship("User", backref="lawyer_profile")
    clients = relationship("Client", back_populates="lawyer", cascade="all, delete-orphan")
    cases = relationship("Case", back_populates="lawyer", cascade="all, delete-orphan")
    templates = relationship("DocumentTemplate", back_populates="lawyer", cascade="all, delete-orphan")
    specializations = relationship("SpecializationCategory", secondary=lawyer_specializations, back_populates="lawyers")
    reviews = relationship("ClientReview", back_populates="lawyer", cascade="all, delete-orphan")
    escalation_responses = relationship("EscalationRequest", back_populates="assigned_lawyer")
    notifications = relationship("LawyerNotification", back_populates="lawyer", cascade="all, delete-orphan")

    @property
    def win_rate(self):
        """Calculate win rate percentage."""
        if self.cases_total == 0:
            return 0.0
        return round((self.cases_won / self.cases_total) * 100, 1)

    @property
    def is_top_rated(self):
        """Top Rated badge: rating >= 4.5 AND >= 10 won cases."""
        return self.rating >= 4.5 and self.cases_won >= 10


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    lawyer_id = Column(Integer, ForeignKey("lawyer_profiles.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Link to platform user if exists
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(50), default="manual")  # "manual", "escalation", "referral"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lawyer = relationship("LawyerProfile", back_populates="clients")
    cases = relationship("Case", back_populates="client", cascade="all, delete-orphan")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    lawyer_id = Column(Integer, ForeignKey("lawyer_profiles.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active")  # active, won, lost, settled, closed, pending
    category = Column(String(100), nullable=True)
    court_case_number = Column(String(100), nullable=True)  # Номер судебного дела
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    closed_at = Column(DateTime, nullable=True)

    lawyer = relationship("LawyerProfile", back_populates="cases")
    client = relationship("Client", back_populates="cases")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan")
    outcome = relationship("CaseOutcome", back_populates="case", uselist=False, cascade="all, delete-orphan")


class CaseNote(Base):
    __tablename__ = "case_notes"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    case = relationship("Case", back_populates="notes")


class CaseOutcome(Base):
    """Verified outcome of a case — the core of win-rate calculation."""
    __tablename__ = "case_outcomes"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), unique=True, nullable=False)
    result = Column(String(20), nullable=False)  # "won", "lost", "settled"
    court_decision_number = Column(String(255), nullable=True)  # Номер решения суда
    amount_won = Column(Float, nullable=True)  # Сумма выигрыша
    verified = Column(Boolean, default=False)  # Подтверждено системой
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    case = relationship("Case", back_populates="outcome")


class ClientReview(Base):
    """Client review after case completion."""
    __tablename__ = "client_reviews"

    id = Column(Integer, primary_key=True, index=True)
    lawyer_id = Column(Integer, ForeignKey("lawyer_profiles.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    rating = Column(Float, nullable=False)  # 1.0 - 5.0
    comment = Column(Text, nullable=True)
    is_anonymous = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lawyer = relationship("LawyerProfile", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews_given")


class EscalationRequest(Base):
    """AI → Lawyer escalation bridge. The core of the funnel."""
    __tablename__ = "escalation_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=True)
    lawyer_id = Column(Integer, ForeignKey("lawyer_profiles.id"), nullable=True)  # Assigned lawyer
    category = Column(String(100), nullable=False)  # Legal category
    city = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)  # AI-generated case summary
    ai_analysis = Column(Text, nullable=True)  # AI's preliminary analysis
    document_ids_json = Column(Text, nullable=True)  # JSON: IDs of generated docs
    status = Column(String(30), default="pending")  # pending, accepted, declined, completed
    urgency = Column(String(20), default="normal")  # low, normal, high, critical
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    responded_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="escalation_requests")
    assigned_lawyer = relationship("LawyerProfile", back_populates="escalation_responses")


class LawyerNotification(Base):
    """Notification system for lawyers."""
    __tablename__ = "lawyer_notifications"

    id = Column(Integer, primary_key=True, index=True)
    lawyer_id = Column(Integer, ForeignKey("lawyer_profiles.id"), nullable=False)
    type = Column(String(50), nullable=False)  # "new_lead", "new_review", "rating_change", "badge_earned"
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    reference_id = Column(Integer, nullable=True)  # ID of related entity
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lawyer = relationship("LawyerProfile", back_populates="notifications")


class DocumentTemplate(Base):
    __tablename__ = "document_templates"

    id = Column(Integer, primary_key=True, index=True)
    lawyer_id = Column(Integer, ForeignKey("lawyer_profiles.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    template_content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lawyer = relationship("LawyerProfile", back_populates="templates")
