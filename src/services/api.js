/**
 * API Service — connects React frontend to FastAPI backend.
 * Handles JWT auth, all endpoints for chat, documents, counterparty, audit, stats.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

// ── Auth Failure Handler (set by AuthContext) ──
let _onAuthFailure = null;

export function setAuthFailureHandler(handler) {
  _onAuthFailure = handler;
}

// ── Token Management ──
function getToken() {
  return localStorage.getItem('auth_token');
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
  const headers = {
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
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth Fetch for binary (file download) ──
async function requestBlob(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

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

  async sendMessage(sessionId, content) {
    return request(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async streamMessage(sessionId, content, onChunk) {
    const token = getToken();
    const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
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

  getDownloadUrl(docId) {
    return `${API_BASE}/documents/${docId}/download`;
  },

  async generate(docType, description) {
    return request('/documents/generate', {
      method: 'POST',
      body: JSON.stringify({ doc_type: docType, description }),
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

  async getHistory() {
    return request('/audit/history');
  },

  async getDetail(auditId) {
    return request(`/audit/history/${auditId}`);
  },
};

// ── Stats API ──
export const statsApi = {
  async getDashboard() {
    return request('/stats');
  },
};

// ── Lawyer Workspace API ──
export const lawyerApi = {
  async getProfile() {
    return request('/lawyer/profile');
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
