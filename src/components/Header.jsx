import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from './LanguageToggle';
import { Bell, Keyboard, LogOut, MessageSquare, FileText, User, Settings, HelpCircle } from 'lucide-react';

export default function Header() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('[data-menu]')) {
        setShowUserMenu(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Keyboard shortcuts help modal
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const shortcuts = [
    { keys: ['Ctrl', 'K'], desc: 'Командная палитра' },
    { keys: ['Ctrl', '/'], desc: 'Горячие клавиши' },
    { keys: ['Ctrl', 'N'], desc: 'Новый чат' },
    { keys: ['Ctrl', 'B'], desc: 'Показать/скрыть боковую панель' },
    { keys: ['Enter'], desc: 'Отправить сообщение' },
    { keys: ['Shift', 'Enter'], desc: 'Новая строка в сообщении' },
  ];

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 bg-obsidian-950/80 backdrop-blur-xl border-b border-obsidian-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
              transition={{ duration: 0.4 }}
            >
              L
            </motion.div>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-lg tracking-wide">Legal</span>
              <span className="metal-text font-bold text-lg tracking-wide">Ai</span>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />

            {user && (
              <>
                {/* Keyboard Shortcuts Button */}
                <button
                  onClick={() => setShowShortcuts(true)}
                  className="hidden sm:flex w-9 h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] items-center justify-center text-steel-400 hover:text-white transition-all"
                  title="Горячие клавиши (Ctrl+/)"
                >
                  <Keyboard size={16} />
                </button>

                {/* Notification Bell */}
                <div className="relative" data-menu>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                    className="relative w-9 h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-steel-400 hover:text-white transition-all"
                  >
                    <Bell size={16} />
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                      >
                        {unreadCount}
                      </motion.span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-80 bg-obsidian-800/95 backdrop-blur-xl border border-obsidian-600/50 rounded-xl shadow-2xl overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-obsidian-600/50 flex items-center justify-between">
                          <span className="text-sm font-bold text-white">Уведомления</span>
                          {unreadCount > 0 && (
                            <span className="text-[10px] font-bold text-chrome-400 bg-chrome-500/15 px-2 py-0.5 rounded-full">
                              {unreadCount} новых
                            </span>
                          )}
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <Bell size={24} className="mx-auto text-steel-600 mb-2" />
                              <p className="text-sm text-steel-500">Нет уведомлений</p>
                            </div>
                          ) : (
                            notifications.map((n, i) => (
                              <div key={i} className={`px-4 py-3 border-b border-obsidian-700/30 hover:bg-obsidian-700/30 transition-colors cursor-pointer ${!n.read ? 'bg-chrome-500/5' : ''}`}>
                                <p className="text-sm text-steel-300">{n.message}</p>
                                <p className="text-[10px] text-steel-500 mt-1">{n.time}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* User Menu */}
            {user ? (
              <div className="relative" data-menu>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
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
                      className="absolute right-0 mt-3 w-56 bg-obsidian-800/95 backdrop-blur-xl border border-obsidian-600/50 rounded-xl shadow-2xl py-1 z-50 overflow-hidden"
                    >
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-obsidian-600/30">
                        <p className="text-sm font-bold text-white truncate">{user.name}</p>
                        <p className="text-[11px] text-steel-500 truncate">{user.phone || user.email || ''}</p>
                        {user.plan && (
                          <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-chrome-500/10 text-chrome-400 border border-chrome-500/20">
                            {user.plan}
                          </span>
                        )}
                      </div>

                      <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-steel-300 hover:text-white hover:bg-obsidian-700/50 transition-colors" onClick={() => setShowUserMenu(false)}>
                        <MessageSquare size={15} className="text-steel-500" /> {t('nav_chat')}
                      </Link>
                      <Link to="/dashboard/documents" className="flex items-center gap-3 px-4 py-2.5 text-sm text-steel-300 hover:text-white hover:bg-obsidian-700/50 transition-colors" onClick={() => setShowUserMenu(false)}>
                        <FileText size={15} className="text-steel-500" /> {t('nav_documents')}
                      </Link>
                      <Link to="/dashboard/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-steel-300 hover:text-white hover:bg-obsidian-700/50 transition-colors" onClick={() => setShowUserMenu(false)}>
                        <User size={15} className="text-steel-500" /> Профиль
                      </Link>

                      <div className="border-t border-obsidian-600/30 mt-1 pt-1">
                        <button
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                            navigate('/');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut size={15} /> {t('nav_logout')}
                        </button>
                      </div>
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

    {/* Keyboard Shortcuts Modal */}
    <AnimatePresence>
      {showShortcuts && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowShortcuts(false)}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative bg-obsidian-900 border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] max-w-md w-full mx-4 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  L
                </div>
                <div>
                  <span className="text-white font-bold tracking-wide">Legal<span className="text-neutral-500">Ai</span></span>
                </div>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="text-steel-500 hover:text-white transition-colors">
                <span className="text-xl">×</span>
              </button>
            </div>
            <div className="p-6 space-y-3">
              {shortcuts.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm text-steel-300">{s.desc}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((key, j) => (
                      <span key={j}>
                        <kbd className="px-2 py-1 rounded-lg bg-obsidian-800 border border-white/10 text-[11px] font-bold text-steel-300 shadow-sm min-w-[28px] text-center inline-block">
                          {key}
                        </kbd>
                        {j < s.keys.length - 1 && <span className="text-steel-600 mx-0.5">+</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-white/[0.06] bg-obsidian-950/50">
              <p className="text-[11px] text-steel-500 text-center">Нажмите <kbd className="px-1.5 py-0.5 rounded bg-obsidian-800 border border-white/10 text-[10px] font-bold text-steel-400">Esc</kbd> для закрытия</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
