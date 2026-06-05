/**
 * API Service — connects React frontend to FastAPI backend.
 * Handles JWT auth, all endpoints for chat, documents, counterparty, audit, stats,
 * escalation (AI→Lawyer bridge), marketplace, and lawyer workspace.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// ── Auth Failure Handler (set by AuthContext) ──
let _onAuthFailure = null;

export function setAuthFailureHandler(handler) {
  _onAuthFailure = handler;
}

// ── Token Management ──
function getToken() {
  const token = localStorage.getItem('auth_token');
  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }
  return token;
}

function setToken(token) {
  localStorage.setItem('auth_token', token);
}

function clearToken() {
  localStorage.removeItem('auth_token');
}

// ── Base Fetch Wrapper ──
async function request(path, options = {}) {
  const token = getToken();
  const appLang = localStorage.getItem('app_lang') || 'ru';
  const headers = {
    'X-App-Language': appLang,
    ...(options.headers || {}),
  };

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    localStorage.removeItem('auth_user');
    if (_onAuthFailure) {
      _onAuthFailure();
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Ошибка сервера' }));
    let errorMsg = error.detail;
    if (Array.isArray(errorMsg)) {
      errorMsg = errorMsg.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ');
    }
    throw new Error(errorMsg || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth Fetch for binary (file download) ──
async function requestBlob(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    localStorage.removeItem('auth_user');
    if (_onAuthFailure) _onAuthFailure();
    throw new Error('Unauthorized');
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

// ── Auth API ──
export const authApi = {
  async sendCode(phone) {
    return request('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async verify(phone, code) {
    const data = await request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    setToken(data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data;
  },

  async register(name, phone, code) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, phone, code }),
    });
    setToken(data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data;
  },

  async registerEmail(name, email, password) {
    const data = await request('/auth/register-email', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setToken(data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data;
  },

  async loginEmail(email, password) {
    const data = await request('/auth/login-email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data;
  },

  async googleAuth(credential) {
    const data = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    setToken(data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data;
  },

  async registerLawyer(lawyerData) {
    const data = await request('/auth/register-lawyer', {
      method: 'POST',
      body: JSON.stringify(lawyerData),
    });
    setToken(data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data;
  },

  async getMe() {
    return request('/auth/me');
  },

  async updateProfile(data) {
    return request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async generateApiKey() {
    return request('/auth/me/api-key', {
      method: 'POST',
    });
  },

  async toggle2fa() {
    return request('/auth/me/security/2fa', {
      method: 'POST',
    });
  },

  logout() {
    clearToken();
    localStorage.removeItem('auth_user');
  },

  isAuthenticated() {
    return !!getToken();
  },
};

// ── Chat API ──
export const chatApi = {
  async createSession(title) {
    return request('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'Новая консультация' }),
    });
  },

  async listSessions(params = {}) {
    const qs = new URLSearchParams();
    if (params.skip) qs.set('skip', params.skip);
    if (params.limit) qs.set('limit', params.limit);
    if (params.q) qs.set('q', params.q);
    const query = qs.toString();
    return request(`/chat/sessions${query ? '?' + query : ''}`);
  },

  async sendMessage(sessionId, content, attachedDocumentId = null) {
    const body = { content };
    if (attachedDocumentId) body.attached_document_id = attachedDocumentId;
    return request(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async streamMessage(sessionId, content, onChunk, attachedDocumentId = null) {
    const token = getToken();
    const appLang = localStorage.getItem('app_lang') || 'ru';
    const body = { content };
    if (attachedDocumentId) body.attached_document_id = attachedDocumentId;

    const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-App-Language': appLang,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onChunk(data);
          } catch (e) {
            // skip malformed chunks
          }
        }
      }
    }
  },

  async getMessages(sessionId) {
    return request(`/chat/sessions/${sessionId}/messages`);
  },

  async deleteSession(sessionId) {
    return request(`/chat/sessions/${sessionId}`, { method: 'DELETE' });
  },

  async exportSession(sessionId) {
    const blob = await requestBlob(`/chat/sessions/${sessionId}/export`, {
      method: 'POST',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consultation_${sessionId}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async transcribeAudio(file) {
    const formData = new FormData();
    formData.append('file', file);
    return request('/chat/transcribe', {
      method: 'POST',
      body: formData,
    });
  },
};

// ── Documents API ──
export const docsApi = {
  async upload(file) {
    const formData = new FormData();
    formData.append('file', file);
    return request('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async list(params = {}) {
    const qs = new URLSearchParams();
    if (params.skip) qs.set('skip', params.skip);
    if (params.limit) qs.set('limit', params.limit);
    if (params.q) qs.set('q', params.q);
    const query = qs.toString();
    return request(`/documents${query ? '?' + query : ''}`);
  },

  async remove(docId) {
    return request(`/documents/${docId}`, { method: 'DELETE' });
  },

  async download(docId) {
    const blob = await requestBlob(`/documents/${docId}/download`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document_${docId}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async getContent(docId) {
    return request(`/documents/${docId}/content`);
  },

  getDownloadUrl(docId) {
    return `${API_BASE}/documents/${docId}/download`;
  },

  async generate(docType, description) {
    return request('/documents/generate', {
      method: 'POST',
      body: JSON.stringify({ doc_type: docType, description }),
    });
  },
  
  async saveFixed(name, content) {
    return request('/documents/save-fixed', {
      method: 'POST',
      body: JSON.stringify({ name, content }),
    });
  },
};

// ── Counterparty API ──
export const counterpartyApi = {
  async check(bin) {
    return request('/counterparty/check', {
      method: 'POST',
      body: JSON.stringify({ bin }),
    });
  },

  async getHistory() {
    return request('/counterparty/history');
  },

  async getDetail(checkId) {
    return request(`/counterparty/history/${checkId}`);
  },
};

// ── Audit API ──
export const auditApi = {
  async analyze(file) {
    const formData = new FormData();
    formData.append('file', file);
    return request('/audit/analyze', {
      method: 'POST',
      body: formData,
    });
  },

  async analyzeDocument(docId) {
    return request(`/audit/analyze_document/${docId}`, {
      method: 'POST'
    });
  },

  async getDocumentAudit(docId) {
    return request(`/audit/document/${docId}`);
  },

  async getHistory() {
    return request('/audit/history');
  },

  async getDetail(auditId) {
    return request(`/audit/history/${auditId}`);
  },
  
  async downloadReport(auditId) {
    return requestBlob(`/audit/history/${auditId}/report`);
  },

  async deleteItem(auditId) {
    return request(`/audit/history/${auditId}`, {
      method: 'DELETE',
    });
  },

  async clearHistory() {
    return request('/audit/history', {
      method: 'DELETE',
    });
  },

  async reanalyze(text, filename = 'Редактированный документ.docx', auditId = null) {
    return request('/audit/reanalyze', {
      method: 'POST',
      body: JSON.stringify({ text, filename, audit_id: auditId }),
    });
  },

  async saveText(auditId, text) {
    return request(`/audit/history/${auditId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    });
  },

  async quickFix(auditId, riskTitle, riskDescription, riskRecommendation, location) {
    return request('/audit/quick-fix', {
      method: 'POST',
      body: JSON.stringify({
        audit_id: auditId,
        risk_title: riskTitle,
        risk_description: riskDescription,
        risk_recommendation: riskRecommendation,
        location: location,
      }),
    });
  },
};

// ── Stats API ──
export const statsApi = {
  async getDashboard() {
    return request('/stats');
  },
};

// ── Escalation API (AI → Lawyer Bridge) ──
export const escalationApi = {
  async createRequest(data) {
    return request('/escalation/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyRequests() {
    return request('/escalation/my-requests');
  },

  async getLeads(status = null) {
    const qs = status ? `?status=${status}` : '';
    return request(`/escalation/leads${qs}`);
  },

  async respondToLead(escalationId, action, message = null) {
    return request(`/escalation/${escalationId}/respond`, {
      method: 'PATCH',
      body: JSON.stringify({ action, message }),
    });
  },
};

// ── Marketplace API (Public Lawyer Discovery) ──
export const marketplaceApi = {
  async searchLawyers(params = {}) {
    const qs = new URLSearchParams();
    if (params.city) qs.set('city', params.city);
    if (params.specialization) qs.set('specialization', params.specialization);
    if (params.q) qs.set('q', params.q);
    if (params.page) qs.set('page', params.page);
    if (params.per_page) qs.set('per_page', params.per_page);
    const query = qs.toString();
    return request(`/lawyers/search${query ? '?' + query : ''}`);
  },

  async getRankings(params = {}) {
    const qs = new URLSearchParams();
    if (params.city) qs.set('city', params.city);
    if (params.specialization) qs.set('specialization', params.specialization);
    if (params.limit) qs.set('limit', params.limit);
    const query = qs.toString();
    return request(`/lawyers/rankings${query ? '?' + query : ''}`);
  },

  async getPublicProfile(lawyerId) {
    return request(`/lawyers/${lawyerId}/public-profile`);
  },

  async getReviews(lawyerId) {
    return request(`/lawyers/${lawyerId}/reviews`);
  },

  async createReview(lawyerId, data) {
    return request(`/lawyers/${lawyerId}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSpecializations() {
    return request('/lawyers/specializations');
  },

  async getNotifications(unreadOnly = false) {
    return request(`/lawyers/notifications/my${unreadOnly ? '?unread_only=true' : ''}`);
  },

  async markNotificationRead(notificationId) {
    return request(`/lawyers/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead() {
    return request('/lawyers/notifications/read-all', {
      method: 'PATCH',
    });
  },
};

// ── Lawyer Workspace API ──
export const lawyerApi = {
  async getProfile() {
    return request('/lawyer/profile');
  },
  async updateProfile(data) {
    return request('/lawyer/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async getDashboardStats() {
    return request('/lawyer/dashboard-stats');
  },
  async listClients() {
    return request('/lawyer/clients');
  },
  async createClient(data) {
    return request('/lawyer/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deleteClient(id) {
    return request(`/lawyer/clients/${id}`, {
      method: 'DELETE',
    });
  },
  async listCases() {
    return request('/lawyer/cases');
  },
  async createCase(data) {
    return request('/lawyer/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateCase(id, data) {
    return request(`/lawyer/cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async setCaseOutcome(caseId, data) {
    return request(`/lawyer/cases/${caseId}/outcome`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async listTemplates() {
    return request('/lawyer/templates');
  },
  async createTemplate(data) {
    return request('/lawyer/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ── Admin API (Dev / Testing Tools) ──
export const adminApi = {
  async getStats() {
    return request('/admin/stats');
  },
  async getSettings() {
    return request('/admin/settings');
  },
  async updateSettings(data) {
    return request('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async getUsers(role = null) {
    return request(`/admin/users${role ? '?role=' + role : ''}`);
  },
  async deleteUser(userId) {
    return request(`/admin/users/${userId}`, { method: 'DELETE' });
  },
  async updateUser(userId, data) {
    return request(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async getLawyers(verified = null) {
    const qs = verified !== null ? `?verified=${verified}` : '';
    return request(`/admin/lawyers${qs}`);
  },
  async verifyLawyer(lawyerId, verified) {
    return request(`/admin/lawyers/${lawyerId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ verified }),
    });
  },
  async getEscalations() {
    return request('/admin/escalations');
  },
  async impersonate(userId) {
    const data = await request(`/admin/impersonate/${userId}`, { method: 'POST' });
    setToken(data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data;
  },
  async seedDatabase() {
    return request('/admin/seed', { method: 'POST' });
  },
  async getScraperStatus() {
    return request('/admin/scraper/status');
  },
  async startScraper(key = 'all') {
    return request('/admin/scraper/start', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
  },
  async stopScraper() {
    return request('/admin/scraper/stop', { method: 'POST' });
  },
  async getAuditLogs() {
    return request('/admin/audit-logs');
  },
  async clearChats() {
    return request('/admin/maintenance/clear-chats', { method: 'POST' });
  },
  async resetVerifications() {
    return request('/admin/maintenance/reset-verifications', { method: 'POST' });
  },
  async deleteSeededLawyers() {
    return request('/admin/maintenance/delete-seeded', { method: 'POST' });
  },
  async testRagSearch(query) {
    return request(`/admin/rag/search-test?query=${encodeURIComponent(query)}`);
  },
  async testLlmProvider(provider, prompt) {
    return request('/admin/llm-test', {
      method: 'POST',
      body: JSON.stringify({ provider, prompt }),
    });
  },
  async getSystemLogs(lines = 100) {
    return request(`/admin/system-logs?lines=${lines}`);
  },
  async getTokenAnalytics() {
    return request('/admin/token-analytics');
  },
  getExportUrl(type) {
    return `${API_BASE}/admin/export?type=${type}`;
  }
};
