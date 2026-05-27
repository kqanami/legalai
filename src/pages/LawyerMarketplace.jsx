import { useState, useEffect, useRef, memo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, Star, Trophy, Shield, MapPin, Briefcase,
  ArrowLeft, CheckCircle2, Users, Zap, X, SlidersHorizontal, ArrowUpRight
} from 'lucide-react';
import { marketplaceApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';

/* ─────────────────────────────────────────────
   SPOTLIGHT BENTO CARD
───────────────────────────────────────────── */
const BentoCard = memo(({ lawyer, index }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const initials = lawyer.name
    ? lawyer.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.05, 0.4) }}
      className="group relative rounded-[2rem] glass-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/5"
      onMouseMove={handleMouseMove}
    >
      {/* Spotlight Hover Effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              rgba(255,255,255,0.06),
              transparent 80%
            )
          `,
        }}
      />

      {/* Internal Glow on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <Link to={`/lawyers/${lawyer.id}`} className="block h-full relative z-20">
        <div className="p-6 md:p-8 flex flex-col h-full">
          
          {/* Header Row */}
          <div className="flex items-start justify-between mb-6">
            <div className="relative">
              <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-white/[0.01] flex items-center justify-center font-black text-white shadow-2xl w-14 h-14 text-xl">
                {initials}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-lg bg-[#050505] border border-emerald-500/20 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
                <Star size={12} className="text-amber-400" fill="currentColor" />
                <span className="text-sm font-bold text-white">{(lawyer.rating || 0).toFixed(1)}</span>
              </div>
              {lawyer.is_top_rated && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-[9px] font-black tracking-widest text-amber-400 uppercase">
                  <Trophy size={9} /> Топ
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="mb-auto">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-black tracking-tight text-white text-xl">
                {lawyer.name}
              </h3>
              {lawyer.verified && (
                <CheckCircle2 size={16} className="text-emerald-400" />
              )}
            </div>
            <p className="font-medium text-white/40 mb-4 text-sm">
              {lawyer.specialization || 'Общая практика'}
            </p>
          </div>

          {/* Footer Stats Grid */}
          <div className="grid gap-2 mt-6 grid-cols-2">
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col justify-center">
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/20 mb-1 flex items-center gap-1">
                <Trophy size={10} /> Победы
              </span>
              <span className="text-lg font-black text-white/80">{lawyer.cases_won || 0}</span>
            </div>
            
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col justify-center">
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/20 mb-1 flex items-center gap-1">
                <Briefcase size={10} /> Стаж
              </span>
              <span className="text-lg font-black text-white/80">{lawyer.experience_years || 0} <span className="text-xs text-white/30 font-medium">лет</span></span>
            </div>
          </div>

          {/* Hover Arrow */}
          <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            <ArrowUpRight size={18} strokeWidth={2.5} />
          </div>

        </div>
      </Link>
    </motion.div>
  );
});

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function LawyerMarketplace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const initialSpec = new URLSearchParams(location.search).get('specialization') || '';

  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ city: '', specialization: initialSpec });
  const [specializations, setSpecializations] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const inputRef = useRef(null);

  const cities = ['Алматы', 'Астана', 'Шымкент', 'Актобе', 'Тараз', 'Павлодар', 'Атырау'];
  const chips = [
    { label: 'Гражданское', icon: <Shield size={12} /> },
    { label: 'Уголовное',   icon: <Shield size={12} /> },
    { label: 'Семейное',    icon: <Users size={12} /> },
    { label: 'Бизнес',      icon: <Briefcase size={12} /> },
    { label: 'Трудовое',    icon: <Zap size={12} /> },
  ];

  useEffect(() => {
    marketplaceApi.getSpecializations().then(setSpecializations).catch(() => {});
    loadLawyers({ specialization: initialSpec });
  }, []);

  const loadLawyers = async (extra = {}) => {
    setLoading(true);
    try {
      const res = await marketplaceApi.searchLawyers({
        q: search || undefined,
        city: filters.city || undefined,
        specialization: filters.specialization || undefined,
        ...extra,
      });
      setLawyers(res.lawyers || []);
    } catch { } finally { setLoading(false); }
  };

  const applySearch = e => { e.preventDefault(); loadLawyers(); };

  const toggleChip = label => {
    const spec = filters.specialization === label ? '' : label;
    setFilters(f => ({ ...f, specialization: spec }));
    loadLawyers({ specialization: spec });
  };

  const clearAll = () => {
    setFilters({ city: '', specialization: '' });
    setSearch('');
    loadLawyers({ city: '', specialization: '', q: '' });
  };

  const activeCount = [filters.city, filters.specialization].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-white/20">

      {/* ── Topbar ── */}
      <div className="sticky top-0 z-40 border-b border-white/[0.04] bg-black/50 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate(user?.role === 'lawyer' ? '/lawyer' : user ? '/dashboard' : '/')}
            className="w-9 h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08]
              border border-white/[0.05] flex items-center justify-center transition-all group"
          >
            <ArrowLeft size={16} className="text-white/40 group-hover:text-white" />
          </button>
          <span className="text-sm font-bold text-white/60 tracking-wide">Legal Marketplace</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pt-16 pb-32">
        
        {/* ── Premium Hero ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Доступно {lawyers.length} специалистов</span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[1.05] mb-6">
              Найдите <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/30">своего<br/>юриста</span>
            </h1>
            <p className="text-lg text-white/40 leading-relaxed font-medium">
              Платформа объединяет лучших независимых юристов и адвокатов Казахстана для решения ваших задач.
            </p>
          </motion.div>
        </div>

        {/* ── Search & Filters ── */}
        <div className="mb-12 glass-premium rounded-[2rem] p-4 flex flex-col md:flex-row gap-4">
          <form onSubmit={applySearch} className="flex-1 relative">
            <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по имени или специализации..."
              className="w-full h-14 bg-obsidian-950/50 rounded-2xl border border-white/[0.05] pl-14 pr-6 text-sm text-white placeholder-white/30 focus:border-white/20 outline-none transition-colors"
            />
          </form>
          <div className="flex gap-4">
            <CustomSelect value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
              options={[{ value: '', label: 'Все города' }, ...cities.map(c => ({ value: c, label: c }))]} 
              className="w-48 bg-obsidian-950/50 rounded-2xl border border-white/[0.05] h-14"
            />
            <CustomSelect value={filters.specialization} onChange={e => setFilters(f => ({ ...f, specialization: e.target.value }))}
              options={[{ value: '', label: 'Все специализации' }, ...specializations.map(s => ({ value: s.name_ru, label: s.name_ru }))]} 
              className="w-56 bg-obsidian-950/50 rounded-2xl border border-white/[0.05] h-14"
            />
            <button onClick={() => loadLawyers()} className="px-8 h-14 bg-white text-black font-bold rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-[1.02] transition-transform">
              Найти
            </button>
            {activeCount > 0 && (
              <button onClick={clearAll} className="px-6 h-14 bg-white/[0.05] text-white/50 hover:text-white font-bold rounded-2xl hover:bg-white/[0.1] transition-colors border border-white/[0.05]">
                Сбросить
              </button>
            )}
          </div>
        </div>

        {/* ── Category Chips ── */}
        <div className="flex flex-wrap items-center gap-3 mb-12">
          {chips.map(({ label, icon }) => {
            const active = filters.specialization === label;
            return (
              <button key={label} onClick={() => toggleChip(label)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 ${
                  active ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/[0.02] text-white/40 border border-white/[0.05] hover:border-white/[0.1] hover:text-white/80'
                }`}>
                {icon} {label}
              </button>
            );
          })}
        </div>

        {/* ── Bento Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[280px]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-[2rem] bg-white/[0.02] border border-white/[0.04] p-8 overflow-hidden relative">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] mb-6" />
                <div className="h-6 w-1/2 bg-white/[0.05] rounded-lg mb-3" />
                <div className="h-4 w-1/3 bg-white/[0.05] rounded-lg" />
              </div>
            ))}
          </div>
        ) : lawyers.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-6">
              <Search size={32} className="text-white/10" />
            </div>
            <h3 className="text-2xl font-black text-white/50 mb-3">Никого не найдено</h3>
            <p className="text-white/30 max-w-sm mb-8">Попробуйте изменить параметры поиска или сбросить фильтры.</p>
            {activeCount > 0 && (
              <button onClick={clearAll} className="px-6 py-3 rounded-2xl bg-white/[0.05] text-white/60 font-bold hover:bg-white/[0.1] transition-colors border border-white/[0.05]">
                Сбросить фильтры
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 auto-rows-[minmax(280px,auto)]">
            <AnimatePresence mode="popLayout">
              {lawyers.map((l, i) => (
                <BentoCard key={l.id} lawyer={l} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
