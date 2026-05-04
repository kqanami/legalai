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

  return (
    <AuthContext.Provider value={{ user, isLoading, sendCode, login, register, registerLawyer, logout }}>
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
