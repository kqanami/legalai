import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ChevronRight, Plus, Trash2 } from 'lucide-react';
import AnimatedIcon from './AnimatedIcon';
import { useToast } from './Toast';


const navItems = [
  { path: '/dashboard', key: 'nav_chat', exact: true, anim: 'chat' },
  { path: '/dashboard/documents', key: 'nav_documents', anim: 'document' },
  { path: '/dashboard/audit', key: 'nav_audit', anim: 'audit' },
  { path: '/dashboard/history', key: 'nav_history', anim: 'history' },
  { path: '/dashboard/counterparty', key: 'nav_counterparty', anim: 'search' },
  { path: '/lawyers', key: 'nav_lawyers', anim: 'profile' }, // New marketplace link
  { path: '/dashboard/profile', key: 'nav_profile', anim: 'profile' },
];

const sidebarVariants = {
  hidden: { x: -288 },
  visible: {
    x: 0,
    transition: { type: 'spring', damping: 25, stiffness: 200 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.3 },
  }),
};

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useLanguage();
  const { currentSegment, chatHistory, loadSession, sessionId, clearMessages, deleteSession } = useChat();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const segmentColor = currentSegment === 'b2b' ? '#D1D5DB' : currentSegment === 'b2c' ? '#E5E7EB' : '#F3F4F6';

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className="fixed top-16 left-0 bottom-0 w-72 z-40 bg-obsidian-950/95 backdrop-blur-2xl border-r border-obsidian-700/60 lg:translate-x-0"
        variants={sidebarVariants}
        initial="hidden"
        animate={isOpen ? 'visible' : 'hidden'}
        style={{ translateX: undefined }}
        data-open={isOpen}
      >
        <style>{`
          @media (min-width: 1024px) {
            [data-open] { transform: translateX(0) !important; }
          }
        `}</style>

        <div className="flex flex-col h-full p-5">
          {/* Minimalistic AI Status Indicator */}
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="relative flex items-center justify-center w-3 h-3">
              <span className={`absolute inset-0 rounded-full ${currentSegment === 'b2c' ? 'bg-indigo-500/40' : currentSegment === 'b2b' ? 'bg-amber-500/40' : 'bg-emerald-500/40'} animate-ping`}></span>
              <span className={`relative w-1.5 h-1.5 rounded-full ${currentSegment === 'b2c' ? 'bg-indigo-400' : currentSegment === 'b2b' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            </div>
            <span className="text-xs font-mono font-medium tracking-wider text-steel-400 uppercase">
              {currentSegment ? (currentSegment === 'b2c' ? 'C2C Mode' : 'B2B Mode') : 'AI System Active'}
            </span>
          </div>
          
          {/* New Chat Button */}
          <button
            onClick={() => { clearMessages(); navigate('/dashboard'); onClose(); }}
            className="mb-6 w-full py-4 rounded-xl chrome-gradient text-obsidian-950 font-bold text-xs uppercase tracking-widest shadow-[0_4px_20px_rgba(255,255,255,0.1)] hover:shadow-[0_8px_30px_rgba(255,255,255,0.2)] transition-all group flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Новая консультация
          </button>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5">
            {navItems.map((item, i) => {
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <motion.div
                  key={item.path}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                >
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={`sidebar-link group relative overflow-hidden tracking-wide text-sm font-medium ${isActive ? 'active' : ''}`}
                  >
                    {/* Active strictly metallic indicator */}
                    {isActive && (
                      <>
                        <motion.div
                          className="absolute inset-0 bg-chrome-100/5 rounded-xl border border-chrome-500/20"
                          layoutId="active-nav-bg"
                          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        />
                        <motion.div
                          className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-full bg-chrome-200 shadow-[0_0_10px_#fff]"
                          layoutId="active-nav-line"
                        />
                      </>
                    )}

                    <span className="relative z-10 flex items-center gap-4 w-full px-2">
                      <AnimatedIcon type={item.anim}>
                        <span className={`text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${isActive ? 'grayscale-0' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}>{item.icon}</span>
                      </AnimatedIcon>
                      <span>{t(item.key)}</span>
                      {isActive && (
                        <div className="ml-auto flex gap-1">
                           <span className="w-1 h-1 rounded-full bg-chrome-300 animate-pulse-light"></span>
                           <span className="w-1 h-1 rounded-full bg-chrome-500"></span>
                        </div>
                      )}
                    </span>
                  </NavLink>
                </motion.div>
              );
            })}
          </nav>
          
          {/* Recent Chats - Persistence Proof */}
          <div className="mt-8 flex-1 flex flex-col min-h-0">
            <h3 className="text-[10px] font-bold text-steel-500 uppercase tracking-[0.2em] mb-4 px-2 flex items-center gap-2">
              <MessageSquare size={12} className="text-chrome-500" /> {t('nav_history')}
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
              {chatHistory.length === 0 ? (
                <p className="text-[10px] text-obsidian-600 px-2 italic">История пуста</p>
              ) : (
                chatHistory.slice(0, 10).map((chat) => (
                  <div key={chat.id} className="relative group">
                    <button
                      onClick={() => { loadSession(chat.id); navigate('/dashboard'); onClose(); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all duration-200 flex items-center gap-3 pr-12
                        ${sessionId === chat.id 
                          ? 'bg-chrome-500/10 text-chrome-200 border border-chrome-500/20 shadow-sm' 
                          : 'text-steel-400 hover:bg-obsidian-900/60 hover:text-steel-200'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${chat.segment === 'b2b' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                      <span className="truncate flex-1">{chat.question}</span>
                      <ChevronRight size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${sessionId === chat.id ? 'text-chrome-400' : 'text-obsidian-600'}`} />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(chat.id);
                        addToast('Чат удален', 'info');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 text-steel-600 transition-all z-10"
                      title="Удалить чат"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System version */}
          <div className="mt-4 flex items-center justify-center px-3 py-2 rounded-xl bg-obsidian-900/40 border border-obsidian-700/40">
            <span className="text-[11px] text-steel-500 font-medium tracking-wide uppercase">LegalAI • v3.1</span>
          </div>

          {/* Bottom info */}
          <div className="mt-4 border-t border-obsidian-700/60 pt-5 text-center bg-obsidian-900/50 rounded-xl p-4 shadow-inner">
            <p className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-1">{t('footer_powered')}</p>
            <p className="text-[9px] text-obsidian-400 mb-3">{t('footer_disclaimer')}</p>
            <a
              href="https://adilet.zan.kz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-col items-center justify-center text-[10px] font-bold text-chrome-400 hover:text-white transition-colors uppercase tracking-widest gap-1"
            >
              <span className="w-full h-px bg-chrome-700/50 mb-1"></span>
              {t('footer_source')}
            </a>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
