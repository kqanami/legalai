import { useState } from 'react';
import { Outlet, useLocation, useOutlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import Sidebar from '../components/Sidebar';
import CursorGlow from '../components/CursorGlow';
import KineticBackground from '../components/KineticBackground';
import { useLanguage } from '../i18n/LanguageContext';

export default function DashboardLayout() {
  const { logout } = useAuth();
  const { currentSegment } = useChat();
  const { t } = useLanguage();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const outlet = useOutlet(); // Fixed framer-motion Outlet issue

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && isSidebarOpen) {
      setSidebarOpen(false);
    }
    if (isRightSwipe && !isSidebarOpen && touchStart < 40) {
      setSidebarOpen(true);
    }
  };

  // Strict metallic glowing background transitions based on segment
  const bgGradient = currentSegment === 'b2b' 
    ? 'rgba(209, 213, 219, 0.05)' // chrome
    : currentSegment === 'b2c' 
      ? 'rgba(226, 232, 240, 0.05)' // steel
      : 'rgba(255, 255, 255, 0.01)'; // neutral obsidian
      
  return (
    <div 
      className="flex h-[100dvh] bg-black overflow-hidden relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndHandler}
    >
      
      {/* Subtle segment ambient lighting */}
      <div 
        className="absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% -20%, ${bgGradient} 0%, transparent 60%)`,
        }}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10 w-full lg:w-[calc(100%-100px)] lg:ml-[100px] transition-all duration-300">
        
        {/* Mobile Header (Strict/Metallic) */}
        <header className="lg:hidden h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl flex items-center justify-between px-4 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white tracking-wide">Legal<span className="text-neutral-500">Ai</span></h1>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="h-full w-full"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
