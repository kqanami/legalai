import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Crown } from 'lucide-react';
import AnimatedIcon from './AnimatedIcon';

const navItems = [
  { path: '/dashboard', key: 'nav_chat', exact: true, anim: 'chat' },
  { path: '/dashboard/documents', key: 'nav_documents', anim: 'document' },
  { path: '/dashboard/history', key: 'nav_history', anim: 'history' },
  { path: '/dashboard/counterparty', key: 'nav_counterparty', anim: 'search' },
  { path: '/lawyers', key: 'nav_lawyers', anim: 'lawyers' },
  { path: '/dashboard/profile', key: 'nav_profile', anim: 'profile' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useLanguage();
  const { currentSegment, clearMessages } = useChat();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isHovered, setIsHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On desktop, it expands on hover. On mobile, it's fully expanded if open.
  const expanded = isDesktop ? isHovered : true;
  const width = expanded ? '260px' : '72px';
  const translateX = isDesktop ? 0 : (isOpen ? 0 : '-100%');

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {!isDesktop && isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed top-6 bottom-6 left-6 z-50 rounded-3xl bg-neutral-900/60 backdrop-blur-3xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col pointer-events-auto"
        initial={false}
        animate={{ width, x: translateX }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="flex flex-col h-full py-6 px-3">
          {/* Logo Area */}
          <div className="flex items-center mb-8 h-10 overflow-hidden whitespace-nowrap shrink-0">
            <div className="w-[48px] shrink-0 flex items-center justify-center">
              <div className={`flex items-center justify-center font-black transition-all ${expanded ? 'w-10 h-10 rounded-2xl bg-white text-black text-xl shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'w-10 h-10 text-white text-2xl'}`}>
                L
              </div>
            </div>
            <motion.div 
              initial={false}
              animate={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0 }}
              className="flex flex-col ml-2 overflow-hidden"
            >
              <span className="text-white font-bold text-xl tracking-tighter leading-none whitespace-nowrap">Legal<span className="text-neutral-500">Ai</span></span>
              <span className="text-[8px] tracking-widest text-neutral-500 font-bold uppercase mt-1 leading-none whitespace-nowrap">Engine v3.1</span>
            </motion.div>
          </div>

          {/* New Chat Button */}
          <div className="mb-6 shrink-0">
            <button
              onClick={() => { clearMessages(); navigate('/dashboard'); onClose(); }}
              className={`w-full h-12 rounded-2xl flex items-center text-sm font-bold transition-colors overflow-hidden whitespace-nowrap ${expanded ? 'bg-white text-black hover:bg-neutral-200' : 'text-white hover:bg-white/10'}`}
            >
              <div className="w-[48px] shrink-0 flex items-center justify-center">
                <Plus size={22} className="shrink-0" />
              </div>
              <motion.span 
                initial={false}
                animate={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0 }}
                className="tracking-widest uppercase text-xs overflow-hidden block"
              >
                {t('new_chat')}
              </motion.span>
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => { if (!isDesktop) onClose(); }}
                  className={`group relative flex items-center h-12 rounded-2xl transition-all overflow-hidden whitespace-nowrap ${
                    isActive ? (expanded ? 'bg-white/10 text-white shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]' : 'text-white') : 'text-neutral-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10"
                      layoutId="active-indicator"
                    />
                  )}
                  <div className="w-[48px] shrink-0 flex items-center justify-center relative z-0">
                    <AnimatedIcon type={item.anim}>
                      <span className={`text-xl ${isActive ? 'grayscale-0' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                        {item.icon}
                      </span>
                    </AnimatedIcon>
                  </div>
                  <motion.span 
                    initial={false}
                    animate={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0 }}
                    className="font-medium text-sm tracking-wide overflow-hidden block"
                  >
                    {t(item.key)}
                  </motion.span>
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom Area: AI Status */}
          <div className="mt-auto pt-6 shrink-0">
            <div className={`flex items-center h-12 rounded-2xl border transition-all overflow-hidden whitespace-nowrap ${expanded ? 'bg-black/50 border-white/5' : 'bg-transparent border-transparent'}`}>
              <div className="w-[48px] shrink-0 flex items-center justify-center">
                <div className="relative flex items-center justify-center w-3 h-3">
                  <span className={`absolute inset-0 rounded-full ${currentSegment === 'b2c' ? 'bg-indigo-500/40' : currentSegment === 'b2b' ? 'bg-amber-500/40' : 'bg-emerald-500/40'} animate-ping`}></span>
                  <span className={`relative w-1.5 h-1.5 rounded-full ${currentSegment === 'b2c' ? 'bg-indigo-400' : currentSegment === 'b2b' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                </div>
              </div>
              <motion.div 
                initial={false}
                animate={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0 }}
                className="flex flex-col overflow-hidden"
              >
                <span className="text-[10px] font-mono font-bold tracking-wider text-white uppercase leading-none mb-1">
                  {currentSegment ? (currentSegment === 'b2c' ? 'C2C Mode' : 'B2B Mode') : 'System Active'}
                </span>
                {user?.plan && (
                  <span className="text-[9px] font-bold text-neutral-500 uppercase flex items-center gap-1 leading-none">
                    <Crown size={10} className={user.plan === 'business' ? 'text-amber-400' : user.plan === 'ip' ? 'text-chrome-300' : 'text-chrome-500'} /> 
                    {user.plan}
                  </span>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
