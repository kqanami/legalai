import { useState } from 'react';
import { Outlet } from 'react-router-dom';
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

  // Strict metallic glowing background transitions based on segment
  const bgGradient = currentSegment === 'b2b' 
    ? 'rgba(209, 213, 219, 0.05)' // chrome
    : currentSegment === 'b2c' 
      ? 'rgba(226, 232, 240, 0.05)' // steel
      : 'rgba(255, 255, 255, 0.01)'; // neutral obsidian
      
  return (
    <div className="flex h-screen bg-obsidian-950 overflow-hidden relative">
      <CursorGlow segment={currentSegment} />
      
      {/* 3D Kinetic Background behind the dashboard */}
      <div className="absolute inset-0 z-0 opacity-40">
        <KineticBackground variant="dashboard" />
      </div>
      
      {/* Subtle segment ambient lighting */}
      <div 
        className="absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% -20%, ${bgGradient} 0%, transparent 60%)`,
        }}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10 w-full lg:w-[calc(100%-18rem)] lg:ml-72 transition-all duration-300">
        
        {/* Mobile Header (Strict/Metallic) */}
        <header className="lg:hidden h-16 border-b border-obsidian-700/60 bg-obsidian-950/80 backdrop-blur-xl flex items-center justify-between px-4 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-steel-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white tracking-wide">AI-<span className="metal-text">Казахстан</span></h1>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-x-hidden relative">
          <div className="h-full w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
