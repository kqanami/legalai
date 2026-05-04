import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, Briefcase, FileText, BrainCircuit, UserCircle, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function LawyerLayout() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-obsidian-950 text-white overflow-hidden relative">
      {/* Sidebar */}
      <aside className="w-72 bg-obsidian-900 border-r border-obsidian-800 flex flex-col z-20 shadow-2xl relative">
        <div className="p-6 border-b border-obsidian-800 bg-obsidian-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl chrome-gradient flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <BrainCircuit className="text-obsidian-950" size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold tracking-widest text-sm text-chrome-100">PRO JURIST</div>
              <div className="text-[10px] tracking-widest text-steel-400 uppercase font-bold mt-0.5">Workspace</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem to="/lawyer" end icon={<LayoutDashboard size={18} />} label="Обзор" />
          <NavItem to="/lawyer/clients" icon={<Users size={18} />} label="Клиенты" />
          <NavItem to="/lawyer/cases" icon={<Briefcase size={18} />} label="Истории дел" />
          <NavItem to="/lawyer/templates" icon={<FileText size={18} />} label="Шаблоны" />
          <NavItem to="/lawyer/audit" icon={<ShieldCheck size={18} />} label="Аудит договоров" />
          <div className="my-4 border-t border-obsidian-800 mx-4"></div>
          <NavItem to="/lawyer/ai" icon={<BrainCircuit size={18} />} label="AI Ассистент" />
        </nav>

        <div className="p-4 border-t border-obsidian-800 bg-obsidian-900/30">
          <div className="flex items-center justify-between mb-4">
             <span className="text-xs font-medium text-steel-500 tracking-wider">TEMA</span>
             <ThemeToggle />
          </div>
          <NavLink
            to="/lawyer/profile"
            className={({ isActive }) => `flex items-center justify-between p-3 rounded-xl transition-all ${
              isActive ? 'bg-chrome-500 text-obsidian-950' : 'bg-obsidian-800 hover:bg-obsidian-700 text-steel-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCircle size={20} />
              <span className="font-medium text-sm truncate max-w-[120px]">{user?.name}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">PRO</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden z-10 bg-obsidian-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-chrome-900/10 via-obsidian-950 to-obsidian-950 pointer-events-none" />
        <Outlet />
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
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
        ${isActive 
          ? 'bg-chrome-900/20 text-chrome-300 border border-chrome-500/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]' 
          : 'text-steel-400 hover:text-white hover:bg-obsidian-800/50'
        }
      `}
    >
      {icon}
      {label}
    </NavLink>
  );
}
