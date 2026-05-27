import { Outlet, NavLink, useLocation, useOutlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, Briefcase, FileText, BrainCircuit, UserCircle, ShieldCheck, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LawyerLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden p-4 gap-4 font-sans">
      {/* Floating Sidebar */}
      <aside className="w-[260px] bg-[#0a0a0a] border border-white/10 rounded-[2rem] flex flex-col z-20 shadow-2xl relative overflow-hidden">
        {/* Subtle top gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <BrainCircuit className="text-black" size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-black tracking-widest text-sm text-white leading-none">LEGAL<span className="text-neutral-500">PRO</span></div>
              <div className="text-[9px] tracking-widest text-neutral-500 uppercase font-bold mt-1 leading-none">Workspace</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar relative z-10">
          <NavItem to="/lawyer" end icon={<LayoutDashboard size={18} />} label="Обзор" />
          <NavItem to="/lawyer/clients" icon={<Users size={18} />} label="Клиенты" />
          <NavItem to="/lawyer/leads" icon={<Inbox size={18} />} label="Заявки" />
          <NavItem to="/lawyer/cases" icon={<Briefcase size={18} />} label="Дела" />
          <NavItem to="/lawyer/templates" icon={<FileText size={18} />} label="Шаблоны" />
          <div className="my-4 border-t border-white/5 mx-2"></div>
          <NavItem to="/lawyer/ai" icon={<BrainCircuit size={18} />} label="AI Ассистент" />
        </nav>

        <div className="p-4 relative z-10">
          <NavLink
            to="/lawyer/profile"
            className={({ isActive }) => `flex items-center justify-between p-3 rounded-2xl transition-all ${
              isActive ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-[#111] hover:bg-[#1a1a1a] text-neutral-400 border border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCircle size={20} className={isActive ? 'text-black' : 'text-neutral-500'} />
              <span className="font-bold text-xs truncate max-w-[120px] tracking-wide">{user?.name || 'Юрист'}</span>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-black/50' : 'text-neutral-600'}`}>PRO</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden relative shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/[0.03] via-transparent to-transparent pointer-events-none" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full w-full overflow-y-auto custom-scrollbar"
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `
        group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-xs tracking-wide overflow-hidden relative
        ${isActive 
          ? 'text-white bg-white/5' 
          : 'text-neutral-500 hover:text-white hover:bg-white/5'
        }
      `}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div 
              layoutId="lawyer-active-nav"
              className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
            />
          )}
          <div className={`transition-transform duration-300 ${isActive ? 'scale-110 text-white' : 'group-hover:scale-110 text-neutral-400 group-hover:text-white'}`}>
            {icon}
          </div>
          {label}
        </>
      )}
    </NavLink>
  );
}
