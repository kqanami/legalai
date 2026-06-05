import os

# 1. Update models.py
with open('backend/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

if 'api_key = Column' not in content:
    content = content.replace(
        '    city = Column(String(100), nullable=True)\n    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))',
        '    city = Column(String(100), nullable=True)\n    api_key = Column(String(100), nullable=True, unique=True, index=True)\n    two_factor_enabled = Column(Boolean, default=False)\n    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))'
    )
    with open('backend/models.py', 'w', encoding='utf-8') as f:
        f.write(content)

# 2. Update schemas.py
with open('backend/schemas.py', 'r', encoding='utf-8') as f:
    content = f.read()

if 'class UserUpdateRequest' not in content:
    content = content.replace(
        'class UserResponse(BaseModel):\n    id: int\n    name: str\n    phone: Optional[str] = None\n    email: Optional[str] = None\n    role: str\n    plan: str\n    city: Optional[str] = None\n\n    class Config:',
        'class UserResponse(BaseModel):\n    id: int\n    name: str\n    phone: Optional[str] = None\n    email: Optional[str] = None\n    role: str\n    plan: str\n    city: Optional[str] = None\n    api_key: Optional[str] = None\n    two_factor_enabled: bool = False\n\n    class Config:'
    )
    update_req = """
class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None

"""
    content = content.replace('# ── Chat ──', update_req + '# ── Chat ──')
    
    # Also add it to imports in auth.py schemas
    with open('backend/schemas.py', 'w', encoding='utf-8') as f:
        f.write(content)

# 3. Update auth.py
with open('backend/routers/auth.py', 'r', encoding='utf-8') as f:
    content = f.read()

if 'UserUpdateRequest' not in content:
    content = content.replace(
        'from schemas import SendCodeRequest, VerifyRequest, RegisterRequest, RegisterLawyerRequest, AuthResponse, UserResponse, RegisterEmailRequest, LoginEmailRequest, GoogleAuthRequest',
        'from schemas import SendCodeRequest, VerifyRequest, RegisterRequest, RegisterLawyerRequest, AuthResponse, UserResponse, RegisterEmailRequest, LoginEmailRequest, GoogleAuthRequest, UserUpdateRequest'
    )
    
    new_endpoints = """
@router.put("/me", response_model=UserResponse)
def update_me(req: UserUpdateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    \"\"\"Update current user profile.\"\"\"
    if req.name is not None: user.name = req.name
    if req.phone is not None: user.phone = req.phone
    if req.email is not None: user.email = req.email
    if req.city is not None: user.city = req.city
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

import secrets
@router.post("/me/api-key", response_model=UserResponse)
def generate_api_key(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    \"\"\"Generate a new API key for the user.\"\"\"
    user.api_key = f"sk-live-{secrets.token_urlsafe(24)}"
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

@router.post("/me/security/2fa", response_model=UserResponse)
def toggle_2fa(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    \"\"\"Toggle 2FA for the user.\"\"\"
    user.two_factor_enabled = not user.two_factor_enabled
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

"""
    content += new_endpoints
    with open('backend/routers/auth.py', 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Backend patched successfully.")
