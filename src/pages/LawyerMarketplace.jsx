import { useState, useEffect, memo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Search, Star, Trophy, Shield, MapPin, Clock, ChevronRight, Filter, Users, ArrowLeft, Scale, CheckCircle2, ChevronDown, X } from 'lucide-react';
import { marketplaceApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';

/* ── Animated Background ── */
const BackgroundEffects = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-0 left-[20%] w-[40vw] h-[40vw] rounded-full bg-chrome-500/5 blur-[120px]" />
    <div className="absolute bottom-0 right-[20%] w-[40vw] h-[40vw] rounded-full bg-emerald-500/5 blur-[120px]" />
  </div>
));

/* ── Win Rate Ring ── */
const WinRateRing = memo(({ rate, size = 52 }) => {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 80 ? '#10B981' : rate >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full opacity-10 blur-sm" style={{ backgroundColor: color }} />
      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <span className="text-[11px] font-bold text-white tracking-tight">{rate}%</span>
      </div>
    </div>
  );
});

/* ── Badges ── */
const TopRatedBadge = () => (
  <motion.div
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide"
    style={{
      background: 'rgba(245,158,11,0.1)',
      border: '1px solid rgba(245,158,11,0.2)',
      color: '#FBBF24',
    }}
    whileHover={{ scale: 1.05 }}
  >
    <Trophy size={10} className="text-amber-400" /> ТОП
  </motion.div>
);

const VerifiedBadge = () => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
    <CheckCircle2 size={10} /> PRO
  </span>
);

/* ── Lawyer Card ── */
const LawyerCard = memo(({ lawyer }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link to={`/lawyers/${lawyer.id}`} className="block h-full">
        <div className="h-full relative rounded-3xl overflow-hidden transition-all duration-500 bg-obsidian-900/40 border border-white/[0.04] hover:bg-obsidian-900/60 hover:border-chrome-500/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          {/* Subtle top glare */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="p-6 sm:p-7 relative z-10 flex flex-col h-full">
            {/* Header: Avatar & Info */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-obsidian-800 to-obsidian-900 border border-white/[0.08] flex items-center justify-center text-white font-bold text-xl shadow-inner group-hover:border-chrome-500/50 transition-colors duration-500">
                    {lawyer.name?.charAt(0) || '?'}
                  </div>
                  {/* Online Indicator */}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-obsidian-950 rounded-full flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white tracking-tight group-hover:text-chrome-300 transition-colors">
                    {lawyer.name}
                  </h3>
                  <p className="text-sm text-steel-400 mt-0.5">
                    {lawyer.specialization || 'Общая практика'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {lawyer.is_top_rated && <TopRatedBadge />}
                {lawyer.verified && <VerifiedBadge />}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-steel-400/90 line-clamp-2 leading-relaxed mb-6">
              {lawyer.description || "Опытный специалист, готовый помочь в решении ваших юридических вопросов."}
            </p>

            {/* Stats (Minimalist) */}
            <div className="flex items-center justify-between mt-auto pt-5 border-t border-white/[0.04]">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-amber-400" fill="currentColor" />
                  <span className="text-sm font-semibold text-white">{lawyer.rating?.toFixed(1) || '0.0'}</span>
                  <span className="text-xs text-steel-500">({lawyer.review_count || 0})</span>
                </div>
                <div className="w-px h-4 bg-white/[0.06]" />
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-emerald-400" />
                  <span className="text-sm font-semibold text-white">{lawyer.cases_won || 0}</span>
                  <span className="text-xs text-steel-500">дел</span>
                </div>
              </div>
              <WinRateRing rate={lawyer.win_rate || 0} size={42} />
            </div>
            
            {/* Location & Exp */}
            <div className="flex items-center gap-4 mt-5 pt-5 border-t border-white/[0.04] text-xs font-medium text-steel-500">
              {lawyer.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-steel-400" /> {lawyer.city}
                </span>
              )}
              {lawyer.experience_years > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-steel-400" /> Стаж {lawyer.experience_years} лет
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

/* ── Main Page ── */
export default function LawyerMarketplace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Parse query params (e.g. from escalation chip)
  const searchParams = new URLSearchParams(location.search);
  const initialSpec = searchParams.get('specialization') || '';

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ city: '', specialization: initialSpec });
  const [specializations, setSpecializations] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const cities = ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Тараз', 'Павлодар', 'Атырау'];
  const quickCategories = ['Гражданское право', 'Уголовное право', 'Семейное право', 'Бизнес и налоги'];

  useEffect(() => {
    loadSpecializations();
    loadLawyers({ specialization: initialSpec });
  }, []);

  const loadSpecializations = async () => {
    try {
      const data = await marketplaceApi.getSpecializations();
      setSpecializations(data);
    } catch (e) {
      console.error('Failed to load specializations:', e);
    }
  };

  const loadLawyers = async (params = {}) => {
    setLoading(true);
    try {
      const data = await marketplaceApi.searchLawyers({
        q: search || undefined,
        city: filters.city || undefined,
        specialization: filters.specialization || undefined,
        ...params,
      });
      setLawyers(data.lawyers || []);
    } catch (e) {
      console.error('Failed to load lawyers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadLawyers();
  };

  const setQuickCategory = (cat) => {
    const newSpec = filters.specialization === cat ? '' : cat;
    setFilters({ ...filters, specialization: newSpec });
    loadLawyers({ specialization: newSpec, q: search, city: filters.city });
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-obsidian-950 relative selection:bg-chrome-500/30 selection:text-white pb-20">
      <BackgroundEffects />
      
      {/* ── Apple-like Top Header ── */}
      <div className="sticky top-0 z-40 bg-obsidian-950/60 backdrop-blur-3xl supports-[backdrop-filter]:bg-obsidian-950/40 border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(user?.role === 'lawyer' ? '/lawyer' : user ? '/dashboard' : '/')} 
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.03] hover:bg-white/[0.08] transition-colors group"
          >
            <ArrowLeft size={18} className="text-steel-400 group-hover:text-white transition-colors" />
          </button>
          
          <div className="flex items-center gap-2">
            <Scale size={20} className="text-chrome-400" />
            <span className="text-sm font-bold text-white tracking-wide">Каталог Юристов</span>
          </div>
          
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* ── Hero / Spotlight Search ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative z-30 text-center">
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
          Найдите своего <span className="text-transparent bg-clip-text bg-gradient-to-r from-chrome-400 to-emerald-400">эксперта</span>
        </h1>
        <p className="text-steel-400 text-lg mb-10 max-w-2xl mx-auto">
          Проверенные юристы и адвокаты для решения любых правовых задач.
        </p>

        {/* Spotlight Search Bar */}
        <form onSubmit={handleSearch} className="relative group max-w-2xl mx-auto shadow-2xl">
          <div className="absolute inset-0 bg-chrome-500/20 blur-xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
          <div className="relative flex items-center bg-obsidian-900/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-2 focus-within:border-chrome-500/50 transition-colors">
            <div className="pl-4 pr-2">
              <Search size={22} className="text-steel-400 group-focus-within:text-chrome-400 transition-colors" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Имя, фамилия или специализация..."
              className="flex-1 bg-transparent text-lg text-white placeholder-steel-500 py-3 focus:outline-none"
            />
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-2xl transition-colors ${showFilters || activeFiltersCount > 0 ? 'bg-chrome-500/10 text-chrome-400' : 'text-steel-400 hover:bg-white/[0.05]'}`}
            >
              <Filter size={20} />
            </button>
            
            <button type="submit" className="ml-2 px-6 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-steel-300 hover:text-white border border-white/[0.05] font-semibold transition-colors">
              Найти
            </button>
          </div>
        </form>

        {/* Quick Pills */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {quickCategories.map(cat => {
            const isActive = filters.specialization === cat;
            return (
              <button
                key={cat}
                onClick={() => setQuickCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive 
                    ? 'bg-chrome-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                    : 'bg-white/[0.04] text-steel-400 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 text-left max-w-2xl mx-auto z-50 relative"
            >
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.04] backdrop-blur-xl">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-steel-400 uppercase tracking-wider mb-2">Город</label>
                    <CustomSelect
                      value={filters.city}
                      onChange={(e) => setFilters({...filters, city: e.target.value})}
                      options={[
                        { value: '', label: 'Все города' },
                        ...cities.map(c => ({ value: c, label: c }))
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-steel-400 uppercase tracking-wider mb-2">Специализация</label>
                    <CustomSelect
                      value={filters.specialization}
                      onChange={(e) => setFilters({...filters, specialization: e.target.value})}
                      options={[
                        { value: '', label: 'Все направления' },
                        ...specializations.map(s => ({ value: s.name_ru, label: s.name_ru }))
                      ]}
                    />
                  </div>
                </div>
                {activeFiltersCount > 0 && (
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={() => {
                        setFilters({ city: '', specialization: '' });
                        loadLawyers({ city: '', specialization: '' });
                      }} 
                      className="px-4 py-2 rounded-xl text-red-400 hover:bg-red-400/10 text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                      <X size={16} /> Сбросить фильтры
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[280px] rounded-3xl bg-white/[0.02] border border-white/[0.04] p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <div className="flex gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04]" />
                  <div className="flex-1 pt-2 space-y-3">
                    <div className="h-4 bg-white/[0.04] rounded w-3/4" />
                    <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2 mt-10">
                  <div className="h-3 bg-white/[0.04] rounded w-full" />
                  <div className="h-3 bg-white/[0.04] rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : lawyers.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center py-20 px-4"
          >
            <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-6">
              <Search size={32} className="text-steel-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Ничего не найдено</h3>
            <p className="text-steel-400 text-sm max-w-sm">
              По вашим критериям не найдено ни одного юриста. Попробуйте смягчить фильтры.
            </p>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {lawyers.map((lawyer) => (
                <LawyerCard key={lawyer.id} lawyer={lawyer} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
