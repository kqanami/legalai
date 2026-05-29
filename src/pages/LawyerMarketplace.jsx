import { useState, useEffect, memo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Search, Star, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { marketplaceApi } from '../services/api';

/* ─────────────────────────────────────────────
   DIRECTORY CARD (Redesigned)
───────────────────────────────────────────── */
const LawyerCard = memo(({ lawyer, index }) => {
  const initials = lawyer.name
    ? lawyer.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: index * 0.04 }}
      className="group relative"
    >
      <Link to={`/lawyers/${lawyer.id}`} className="block p-6 lg:p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 relative overflow-hidden">
        
        {/* Top Info */}
        <div className="flex items-start gap-5 mb-6">
          <motion.div layoutId={`lawyer-avatar-${lawyer.id}`} className="w-16 h-16 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-xl">
            {initials}
          </motion.div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1.5">
              <motion.h3 layoutId={`lawyer-name-${lawyer.id}`} className="text-xl font-bold text-white truncate">{lawyer.name}</motion.h3>
              {lawyer.verified && <CheckCircle2 size={16} className="text-white/40 shrink-0" />}
            </div>
            <p className="text-sm text-white/50 truncate">
              {lawyer.specialization || 'Общая практика'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5">
              <Star size={12} className="text-white" />
              <span className="text-xs font-bold text-white">{(lawyer.rating || 0).toFixed(1)}</span>
            </div>
            {lawyer.is_top_rated && (
              <span className="text-[9px] font-black tracking-widest text-white/40 uppercase mt-1">Топ</span>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6 pt-5 border-t border-white/5">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">Успешных дел</span>
            <span className="text-sm font-semibold text-white/80">{lawyer.cases_won || 0}</span>
          </div>
          <div className="w-px h-6 bg-white/5" />
          <div className="flex flex-col">
            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">Опыт работы</span>
            <span className="text-sm font-semibold text-white/80">{lawyer.experience_years || 0} лет</span>
          </div>
          {lawyer.city && (
            <>
              <div className="w-px h-6 bg-white/5" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">Город</span>
                <span className="text-sm font-semibold text-white/80 truncate max-w-[100px]">{lawyer.city}</span>
              </div>
            </>
          )}
        </div>

      </Link>
    </motion.div>
  );
});

/* ─────────────────────────────────────────────
   MAIN COMPONENT (Split-Pane Directory)
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

  const cities = ['Алматы', 'Астана', 'Шымкент', 'Актобе', 'Тараз', 'Павлодар', 'Атырау'];

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

  const handleFilterChange = (key, value) => {
    const newValue = filters[key] === value ? '' : value;
    setFilters(prev => ({ ...prev, [key]: newValue }));
    loadLawyers({ [key]: newValue });
  };

  const clearAll = () => {
    setFilters({ city: '', specialization: '' });
    setSearch('');
    loadLawyers({ city: '', specialization: '', q: '' });
  };

  const activeCount = [filters.city, filters.specialization].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 flex flex-col lg:flex-row">
      
      {/* ── Left Pane: Sticky Filters ── */}
      <div className="lg:w-[35%] xl:w-[30%] border-b lg:border-b-0 lg:border-r border-white/5 bg-[#050505] z-20">
        <div className="lg:sticky lg:top-0 lg:h-screen flex flex-col max-h-screen overflow-y-auto custom-scrollbar">
          
          <div className="p-6 lg:p-8 pb-0">
            <button
              onClick={() => navigate(user?.role === 'lawyer' ? '/lawyer' : user ? '/dashboard' : '/')}
              className="w-10 h-10 mb-6 lg:mb-8 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-3xl lg:text-5xl font-black tracking-tight mb-6 lg:mb-8">Каталог</h1>
          </div>

          <div className="px-6 lg:px-8 pb-6 lg:pb-8 flex-1 flex flex-col gap-6 lg:gap-10">
            {/* Search */}
            <form onSubmit={applySearch} className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Имя специалиста..."
                className="w-full h-14 bg-white/[0.02] rounded-2xl border border-white/5 pl-12 pr-4 text-sm text-white placeholder-neutral-600 focus:border-white/20 focus:bg-white/[0.05] outline-none transition-colors"
              />
            </form>

            {/* Specializations List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Специализация</h3>
              </div>
              <div className="flex flex-col gap-1">
                {specializations.map(s => {
                  const active = filters.specialization === s.name_ru;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleFilterChange('specialization', s.name_ru)}
                      className={`text-left px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                        active ? 'bg-white text-black' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {s.name_ru}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cities List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Город</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {cities.map(c => {
                  const active = filters.city === c;
                  return (
                    <button
                      key={c}
                      onClick={() => handleFilterChange('city', c)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors border ${
                        active ? 'bg-white text-black border-white' : 'bg-transparent text-neutral-500 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear Filters CTA */}
            {activeCount > 0 && (
              <div className="pt-4 mt-auto">
                <button
                  onClick={clearAll}
                  className="w-full h-12 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Сбросить фильтры
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Pane: Scrollable List ── */}
      <div className="lg:w-[65%] xl:w-[70%] bg-[#050505] min-h-screen relative p-4 sm:p-8 lg:p-12">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 rounded-[2rem] bg-white/[0.02] border border-white/[0.04] p-8 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
                  <div className="flex gap-5 mb-6">
                     <div className="w-16 h-16 rounded-2xl bg-white/5 shrink-0" />
                     <div className="flex-1 space-y-3 pt-2">
                       <div className="h-4 w-1/2 bg-white/5 rounded" />
                       <div className="h-3 w-1/3 bg-white/5 rounded" />
                     </div>
                  </div>
                </div>
              ))}
            </div>
          ) : lawyers.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-6">
                <Search size={32} className="text-white/10" />
              </div>
              <h3 className="text-2xl font-black text-white/50 mb-3">Никого не найдено</h3>
              <p className="text-white/30 max-w-sm mb-8 text-sm">Попробуйте изменить параметры поиска или выбрать другую специализацию.</p>
              {activeCount > 0 && (
                <button onClick={clearAll} className="px-6 py-3 rounded-2xl bg-white/[0.05] text-white font-bold hover:bg-white/[0.1] transition-colors border border-white/[0.05] text-xs uppercase tracking-widest">
                  Сбросить всё
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6"
            >
              <AnimatePresence mode="popLayout">
                {lawyers.map((l, i) => (
                  <LawyerCard key={l.id} lawyer={l} index={i} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

    </div>
  );
}
