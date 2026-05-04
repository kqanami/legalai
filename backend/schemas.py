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

class AuthResponse(BaseModel):
    token: str
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


# ── Chat ──
class CreateSessionRequest(BaseModel):
    title: Optional[str] = "Новая консультация"

class SendMessageRequest(BaseModel):
    content: str

class ReferenceItem(BaseModel):
    title: str
    url: str
    articles: str

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    segment: Optional[str] = None
    references: Optional[List[ReferenceItem]] = None
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

class AuditHistoryItem(BaseModel):
    id: int
    filename: str
    summary: Optional[str] = None
    total_risks: int
    created_at: datetime

    class Config:
        from_attributes = True


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
    phone: str
    code: str
    iin: str
    license_number: str
    specialization: str

class LawyerProfileResponse(BaseModel):
    id: int
    iin: str
    license_number: str
    specialization: str
    verified: bool
    bio: Optional[str] = None
    rating: float
    cases_won: int

    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
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

class CaseResponse(CaseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    notes: List[CaseNoteResponse] = []

    class Config:
        from_attributes = True

class CaseWithClientResponse(CaseResponse):
    client: ClientResponse

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

class LawyerDashboardStats(BaseModel):
    total_clients: int
    active_cases: int
    total_templates: int
    recent_cases: List[CaseWithClientResponse]
    cases_won: int
    rating: float
