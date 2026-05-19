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
    <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-chrome-500/5 blur-[120px]" />
    <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-500/5 blur-[120px]" />
    <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] rounded-full bg-emerald-500/5 blur-[100px]" />
  </div>
));

/* ── Win Rate Ring ── */
const WinRateRing = memo(({ rate, size = 60 }) => {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 80 ? '#10B981' : rate >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Glow effect behind ring */}
      <div className="absolute inset-0 rounded-full opacity-20 blur-md" style={{ backgroundColor: color }} />
      
      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <span className="text-[13px] font-black text-white leading-none tracking-tight">{rate}%</span>
      </div>
    </div>
  );
});

/* ── Badges ── */
const TopRatedBadge = () => (
  <motion.div
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
    style={{
      background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(234,179,8,0.05) 100%)',
      border: '1px solid rgba(245,158,11,0.3)',
      color: '#F59E0B',
      boxShadow: '0 0 15px rgba(245,158,11,0.15)',
    }}
    animate={{ boxShadow: ['0 0 15px rgba(245,158,11,0.15)', '0 0 25px rgba(245,158,11,0.3)', '0 0 15px rgba(245,158,11,0.15)'] }}
    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
  >
    <Trophy size={10} className="text-amber-400" /> ТОП ЮРИСТ
  </motion.div>
);

const VerifiedBadge = () => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
    <CheckCircle2 size={10} /> PRO
  </span>
);

/* ── Lawyer Card ── */
const LawyerCard = memo(({ lawyer, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={`/lawyers/${lawyer.id}`} className="block h-full">
        <div className="h-full relative group rounded-2xl overflow-hidden transition-all duration-500" style={{
          background: 'linear-gradient(145deg, rgba(11,13,20,0.8) 0%, rgba(11,13,20,0.4) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Hover glowing border & background */}
          <div className="absolute inset-0 bg-gradient-to-br from-chrome-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-chrome-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ maskImage: 'linear-gradient(white, white)', maskComposite: 'exclude', WebkitMaskImage: 'linear-gradient(white, white)', WebkitMaskComposite: 'xor', padding: '1px' }} />
          
          <div className="p-6 relative z-10 flex flex-col h-full">
            {/* Header: Avatar, Info, Ring */}
            <div className="flex items-start gap-4 mb-5">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-chrome-500/20 to-obsidian-800 border border-chrome-500/30 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {lawyer.name?.charAt(0) || '?'}
                </div>
                {/* Online Indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-obsidian-950 rounded-full flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0 pt-1">
                <h3 className="text-lg font-bold text-white truncate group-hover:text-chrome-300 transition-colors">
                  {lawyer.name}
                </h3>
                <p className="text-xs text-chrome-500/80 mt-0.5 mb-2 truncate">
                  {lawyer.specialization || 'Юрист широкого профиля'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {lawyer.is_top_rated && <TopRatedBadge />}
                  {lawyer.verified && <VerifiedBadge />}
                </div>
              </div>
              
              <WinRateRing rate={lawyer.win_rate || 0} />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mt-2 mb-4">
              <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-1 text-sm font-bold text-white">
                  <Star size={12} className="text-amber-400" fill="currentColor" />
                  {lawyer.rating?.toFixed(1) || '0.0'}
                </div>
                <div className="text-[10px] text-steel-500 font-medium uppercase tracking-wider mt-0.5">Рейтинг</div>
              </div>
              <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-sm font-bold text-emerald-400">{lawyer.cases_won || 0}</div>
                <div className="text-[10px] text-steel-500 font-medium uppercase tracking-wider mt-0.5">Побед</div>
              </div>
              <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-sm font-bold text-white">{lawyer.review_count || 0}</div>
                <div className="text-[10px] text-steel-500 font-medium uppercase tracking-wider mt-0.5">Отзывов</div>
              </div>
            </div>

            {/* Bio Snippet */}
            {lawyer.description && (
              <p className="text-sm text-steel-400 line-clamp-2 mb-5 leading-relaxed">
                {lawyer.description}
              </p>
            )}

            {/* Footer with Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-auto pt-5 border-t border-white/[0.04]">
              <div className="flex items-center gap-4 text-xs font-medium text-steel-400">
                {lawyer.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-chrome-500" /> {lawyer.city}
                  </span>
                )}
                {lawyer.experience_years > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-chrome-500" /> {lawyer.experience_years} лет
                  </span>
                )}
              </div>
              <div className="px-5 py-2.5 rounded-xl bg-chrome-500/10 text-chrome-400 font-bold text-sm text-center group-hover:bg-chrome-500 group-hover:text-white transition-all duration-300">
                Связаться
              </div>
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
    <div className="min-h-screen bg-obsidian-950 relative selection:bg-chrome-500/30 selection:text-white">
      <BackgroundEffects />
      
      {/* ── Top Header ── */}
      <div className="sticky top-0 z-30 border-b border-white/[0.04] bg-obsidian-950/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-obsidian-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Navigation & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <button 
              onClick={() => navigate(user?.role === 'lawyer' ? '/lawyer' : user ? '/dashboard' : '/')} 
              className="flex items-center gap-2 text-sm font-medium text-steel-400 hover:text-white transition-colors w-fit"
            >
              <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                <ArrowLeft size={16} />
              </div>
              Вернуться
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chrome-500 to-chrome-600 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                <Scale size={20} className="text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Маркетплейс <span className="text-transparent bg-clip-text bg-gradient-to-r from-chrome-400 to-chrome-200">Юристов</span>
              </h1>
            </div>
            <div className="hidden sm:block w-32" /> {/* Spacer */}
          </div>

          {/* Search & Quick Filters */}
          <div className="flex flex-col gap-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-chrome-500/20 to-transparent rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center bg-obsidian-900 border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-chrome-500/50 transition-colors">
                  <Search size={18} className="absolute left-4 text-steel-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск юриста по имени..."
                    className="w-full bg-transparent text-sm text-white placeholder-steel-500 pl-12 pr-4 py-3.5 focus:outline-none"
                  />
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`relative px-4 sm:px-5 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all duration-300 ${
                  showFilters || activeFiltersCount > 0 
                    ? 'bg-chrome-500/10 border-chrome-500/30 text-chrome-400' 
                    : 'bg-white/[0.02] border-white/[0.06] text-steel-300 hover:bg-white/[0.05]'
                }`}
              >
                <Filter size={16} />
                <span className="hidden sm:inline">Фильтры</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-chrome-500 text-white text-[10px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(14,165,233,0.5)]">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              
              <button type="submit" className="px-6 rounded-xl bg-gradient-to-r from-chrome-600 to-chrome-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(14,165,233,0.2)] hover:shadow-[0_0_25px_rgba(14,165,233,0.4)] transition-all active:scale-95">
                Найти
              </button>
            </form>

            {/* Quick Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-[10px] font-bold text-steel-500 uppercase tracking-wider pr-2">Популярное:</span>
              {quickCategories.map(cat => {
                const isActive = filters.specialization === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setQuickCategory(cat)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 border ${
                      isActive 
                        ? 'bg-chrome-500 text-white border-chrome-400 shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                        : 'bg-white/[0.03] text-steel-400 border-white/[0.05] hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Expanded Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -10 }}
                  animate={{ height: 'auto', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 pb-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] flex flex-wrap gap-5 items-end">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] text-steel-400 font-bold mb-2 uppercase tracking-wider">Город</label>
                        <CustomSelect
                          value={filters.city}
                          onChange={(e) => setFilters({...filters, city: e.target.value})}
                          options={[
                            { value: '', label: 'Все города Казахстана' },
                            ...cities.map(c => ({ value: c, label: c }))
                          ]}
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] text-steel-400 font-bold mb-2 uppercase tracking-wider">Специализация</label>
                        <CustomSelect
                          value={filters.specialization}
                          onChange={(e) => setFilters({...filters, specialization: e.target.value})}
                          options={[
                            { value: '', label: 'Все направления' },
                            ...specializations.map(s => ({ value: s.name_ru, label: s.name_ru }))
                          ]}
                        />
                      </div>
                      {activeFiltersCount > 0 && (
                        <button 
                          onClick={() => {
                            setFilters({ city: '', specialization: '' });
                            loadLawyers({ city: '', specialization: '' });
                          }} 
                          className="px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-colors flex items-center gap-1.5 h-[42px]"
                        >
                          <X size={14} /> Сбросить фильтры
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[220px] rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <div className="flex gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04]" />
                  <div className="flex-1 pt-2 space-y-3">
                    <div className="h-4 bg-white/[0.04] rounded w-3/4" />
                    <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-14 bg-white/[0.03] rounded-xl" />
                  <div className="h-14 bg-white/[0.03] rounded-xl" />
                  <div className="h-14 bg-white/[0.03] rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : lawyers.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-20 px-4"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-chrome-500/20 blur-2xl rounded-full" />
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-obsidian-800 to-obsidian-900 border border-white/[0.08] flex items-center justify-center relative z-10 shadow-xl">
                <Search size={40} className="text-steel-400" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Специалисты не найдены</h3>
            <p className="text-steel-400 text-sm max-w-md">
              По вашему запросу не найдено юристов. Попробуйте изменить параметры фильтрации или выбрать другой город.
            </p>
            {activeFiltersCount > 0 && (
              <button onClick={() => {
                setSearch('');
                setFilters({ city: '', specialization: '' });
                loadLawyers({ city: '', specialization: '', q: '' });
              }} className="mt-8 px-6 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white text-sm font-bold border border-white/[0.05] transition-colors">
                Сбросить все фильтры
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {lawyers.map((lawyer, i) => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
