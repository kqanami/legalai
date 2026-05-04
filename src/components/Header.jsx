import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from './LanguageToggle';

import { Scale } from 'lucide-react';

export default function Header() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-obsidian-950/80 backdrop-blur-xl border-b border-obsidian-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              className="w-10 h-10 rounded-xl chrome-gradient flex items-center justify-center shadow-md shadow-white/10"
              whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
              transition={{ duration: 0.4 }}
            >
              <Scale size={20} className="text-obsidian-950" strokeWidth={2.5} />
            </motion.div>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-lg tracking-wide">AI-</span>
              <span className="metal-text font-bold text-lg tracking-wide">{t('landing_title_accent')}</span>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <LanguageToggle />

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="w-9 h-9 rounded-full chrome-gradient flex items-center justify-center text-obsidian-950 font-bold text-sm shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-white">{user.name}</span>
                  <svg className={`w-4 h-4 text-steel-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-48 bg-obsidian-800/95 backdrop-blur-xl border border-obsidian-600/50 rounded-xl shadow-2xl py-1 z-50 overflow-hidden"
                    >
                      <Link to="/dashboard" className="block px-4 py-3 text-sm text-steel-300 hover:text-white hover:bg-obsidian-700/50 transition-colors" onClick={() => setShowUserMenu(false)}>
                        {t('nav_chat')}
                      </Link>
                      <Link to="/dashboard/documents" className="block px-4 py-3 text-sm text-steel-300 hover:text-white hover:bg-obsidian-700/50 transition-colors" onClick={() => setShowUserMenu(false)}>
                        {t('nav_documents')}
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                          navigate('/');
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-steel-300 hover:text-white hover:bg-obsidian-700/50 transition-colors flex items-center gap-2"
                      >
                        <span className="text-red-400">🚪</span> {t('nav_logout')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/auth" className="btn-primary text-sm px-5 py-2">
                {t('auth_login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
