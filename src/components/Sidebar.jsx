import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import AnimatedIcon from './AnimatedIcon';


const navItems = [
  { path: '/dashboard', key: 'nav_chat', exact: true, anim: 'chat' },
  { path: '/dashboard/documents', key: 'nav_documents', anim: 'document' },
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
  const { currentSegment } = useChat();
  const location = useLocation();

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

          {/* System version */}
          <div className="mt-4 flex items-center justify-center px-3 py-2 rounded-xl bg-obsidian-900/40 border border-obsidian-700/40">
            <span className="text-[11px] text-steel-500 font-medium tracking-wide uppercase">LegalAI • v3.0</span>
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
