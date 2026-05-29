from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Auth ──
class SendCodeRequest(BaseModel):
    phone: str

class VerifyRequest(BaseModel):
    phone: str
    code: str

class RegisterRequest(BaseModel):
    name: str
    phone: str
    code: str

class RegisterEmailRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginEmailRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str

class AuthResponse(BaseModel):
    token: str
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    role: str
    plan: str
    city: Optional[str] = None

    class Config:
        from_attributes = True


# ── Chat ──
class CreateSessionRequest(BaseModel):
    title: Optional[str] = "Новая консультация"

class SendMessageRequest(BaseModel):
    content: str
    attached_document_id: Optional[int] = None

class ReferenceItem(BaseModel):
    title: str
    url: str
    articles: str

class EscalationData(BaseModel):
    needed: bool = False
    reason: Optional[str] = None
    category: Optional[str] = None
    city: Optional[str] = None
    recommended_lawyers: Optional[List[dict]] = None

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    segment: Optional[str] = None
    references: Optional[List[ReferenceItem]] = None
    escalation: Optional[EscalationData] = None
    suggestions: Optional[List[str]] = None
    attached_document_id: Optional[int] = None
    attached_document_name: Optional[str] = None
    timestamp: datetime

class SessionResponse(BaseModel):
    id: int
    title: str
    segment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    preview: Optional[str] = None

    class Config:
        from_attributes = True


# ── Documents ──
class DocumentResponse(BaseModel):
    id: int
    name: str
    original_filename: str
    file_size: int
    doc_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class GenerateDocRequest(BaseModel):
    doc_type: str  # "claim", "complaint", "contract", "statement"
    description: str
    details: Optional[dict] = None


# ── Counterparty ──
class CounterpartyCheckRequest(BaseModel):
    bin: str

class CounterpartyResult(BaseModel):
    companyName: str
    bin: str
    status: str
    registrationDate: str
    director: str
    address: str
    activity: str
    taxDebt: str
    riskLevel: str
    employees: str
    aiAnalysis: Optional[str] = None

class CounterpartyHistoryItem(BaseModel):
    id: int
    bin_number: str
    company_name: Optional[str] = None
    risk_level: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Audit ──
class AuditRisk(BaseModel):
    level: str  # high, medium, low
    title: str
    description: str
    recommendation: str
    article: str
    url: str

class AuditResponse(BaseModel):
    id: Optional[int] = None  # DB id if persisted
    risks: List[AuditRisk]
    summary: str
    totalRisks: int
    original_text: Optional[str] = None
    doc_type: Optional[str] = None

class AuditHistoryItem(BaseModel):
    id: int
    filename: str
    summary: Optional[str] = None
    total_risks: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReanalyzeRequest(BaseModel):
    text: str
    filename: Optional[str] = "Редактированный документ.docx"
    audit_id: Optional[int] = None


class SaveTextRequest(BaseModel):
    text: str


class QuickFixRequest(BaseModel):
    audit_id: int
    risk_title: str
    risk_description: str
    risk_recommendation: str
    location: Optional[str] = ""


# ── Dashboard Stats ──
class DashboardStats(BaseModel):
    total_chats: int
    total_messages: int
    total_documents: int
    total_counterparty_checks: int
    total_audits: int
    recent_sessions: List[SessionResponse]

# ── Lawyer Workspace ──
class RegisterLawyerRequest(BaseModel):
    name: str
    email: str
    password: str
    iin: str
    license_number: str
    specialization: str
    city: Optional[str] = None

class LawyerProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    hourly_rate: Optional[int] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    is_accepting_clients: Optional[bool] = None

class LawyerProfileResponse(BaseModel):
    id: int
    iin: str
    license_number: str
    specialization: str
    verified: bool
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    rating: float
    cases_won: int
    cases_total: int
    city: Optional[str] = None
    experience_years: int
    hourly_rate: int = 0
    is_accepting_clients: bool
    win_rate: float = 0.0
    is_top_rated: bool = False

    class Config:
        from_attributes = True

class LawyerPublicProfileResponse(BaseModel):
    """Public-facing lawyer profile for marketplace."""
    id: int
    name: str
    specialization: str
    specializations: List[str] = []
    verified: bool
    bio: Optional[str] = None
    rating: float
    cases_won: int
    cases_total: int
    win_rate: float = 0.0
    is_top_rated: bool = False
    city: Optional[str] = None
    experience_years: int = 0
    is_accepting_clients: bool = True
    photo_url: Optional[str] = None
    response_time_hours: Optional[float] = None
    review_count: int = 0

class LawyerSearchResult(BaseModel):
    lawyers: List[LawyerPublicProfileResponse]
    total: int
    page: int
    per_page: int

class ClientBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
    source: str = "manual"
    created_at: datetime

    class Config:
        from_attributes = True

class CaseNoteBase(BaseModel):
    content: str

class CaseNoteCreate(CaseNoteBase):
    pass

class CaseNoteResponse(CaseNoteBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "active"
    category: Optional[str] = None
    client_id: int

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    court_case_number: Optional[str] = None

class CaseResponse(CaseBase):
    id: int
    court_case_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    notes: List[CaseNoteResponse] = []

    class Config:
        from_attributes = True

class CaseWithClientResponse(CaseResponse):
    client: ClientResponse

    class Config:
        from_attributes = True

class CaseOutcomeCreate(BaseModel):
    result: str  # "won", "lost", "settled"
    court_decision_number: Optional[str] = None
    amount_won: Optional[float] = None
    notes: Optional[str] = None

class CaseOutcomeResponse(CaseOutcomeCreate):
    id: int
    verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentTemplateBase(BaseModel):
    name: str
    category: Optional[str] = None
    template_content: str

class DocumentTemplateCreate(DocumentTemplateBase):
    pass

class DocumentTemplateResponse(DocumentTemplateBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Escalation (AI → Lawyer Bridge) ──

class EscalationCreateRequest(BaseModel):
    """Created by AI when it detects a complex case."""
    session_id: Optional[int] = None
    category: str
    city: Optional[str] = None
    description: str
    ai_analysis: Optional[str] = None
    urgency: str = "normal"
    lawyer_id: Optional[int] = None  # If user selects a specific lawyer

class EscalationRespondRequest(BaseModel):
    """Lawyer responds to an escalation request."""
    action: str  # "accept" or "decline"
    message: Optional[str] = None

class EscalationResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    session_id: Optional[int] = None
    category: str
    city: Optional[str] = None
    description: str
    ai_analysis: Optional[str] = None
    status: str
    urgency: str
    created_at: datetime
    responded_at: Optional[datetime] = None

class EscalationForClient(BaseModel):
    id: int
    category: str
    description: str
    status: str
    lawyer_name: Optional[str] = None
    lawyer_rating: Optional[float] = None
    created_at: datetime


# ── Reviews ──

class ReviewCreate(BaseModel):
    lawyer_id: int
    case_id: Optional[int] = None
    rating: float  # 1.0 - 5.0
    comment: Optional[str] = None
    is_anonymous: bool = False

class ReviewResponse(BaseModel):
    id: int
    rating: float
    comment: Optional[str] = None
    reviewer_name: Optional[str] = None  # Hidden if anonymous
    created_at: datetime

    class Config:
        from_attributes = True


# ── Notifications ──

class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: Optional[str] = None
    reference_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Rankings ──

class LawyerRankingItem(BaseModel):
    id: int
    name: str
    specialization: str
    city: Optional[str] = None
    rating: float
    win_rate: float
    cases_won: int
    cases_total: int
    is_top_rated: bool
    verified: bool
    review_count: int = 0

class RankingsResponse(BaseModel):
    rankings: List[LawyerRankingItem]
    total: int


# ── Lawyer Dashboard Stats (Extended) ──

class LawyerDashboardStats(BaseModel):
    total_clients: int
    active_cases: int
    total_templates: int
    recent_cases: List[CaseWithClientResponse]
    cases_won: int
    cases_total: int
    rating: float
    win_rate: float
    is_top_rated: bool
    pending_leads: int
    total_reviews: int
    unread_notifications: int
