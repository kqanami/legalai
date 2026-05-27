import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, setAuthFailureHandler } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Set up auth failure handler for api.js (replaces window.location.href)
  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
      authApi.logout();
      navigate('/auth');
    });
    return () => setAuthFailureHandler(null);
  }, [navigate]);

  // Fetch the latest user info on mount if logged in
  useEffect(() => {
    const fetchMe = async () => {
      if (authApi.isAuthenticated()) {
        try {
          const me = await authApi.getMe();
          setUser(me);
          localStorage.setItem('auth_user', JSON.stringify(me));
        } catch (e) {
          // Failure handler will trigger if it's a 401
          console.error('Failed to fetch latest user info:', e);
        }
      }
    };
    fetchMe();
  }, []);

  const sendCode = useCallback(async (phone) => {
    setIsLoading(true);
    try {
      const result = await authApi.sendCode(phone);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (phone, otp) => {
    setIsLoading(true);
    try {
      const data = await authApi.verify(phone, otp);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name, phone, otp) => {
    setIsLoading(true);
    try {
      const data = await authApi.register(name, phone, otp);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerLawyer = useCallback(async (lawyerData) => {
    setIsLoading(true);
    try {
      const data = await authApi.registerLawyer(lawyerData);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  const updateUserLocal = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return null;
      const next = { ...prev, ...updates };
      localStorage.setItem('auth_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, sendCode, login, register, registerLawyer, logout, updateUserLocal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
