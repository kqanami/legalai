import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Search, Star, Trophy, Shield, MapPin, Clock, ChevronRight, Filter, Users, Award, TrendingUp, X, Scale, ArrowLeft } from 'lucide-react';
import { marketplaceApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';

/* ── Win Rate Ring ── */
function WinRateRing({ rate, size = 56 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 80 ? '#10B981' : rate >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{rate}%</span>
      </div>
    </div>
  );
}

/* ── Top Rated Badge ── */
function TopRatedBadge() {
  return (
    <motion.div
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(234,179,8,0.08) 100%)',
        border: '1px solid rgba(245,158,11,0.3)',
        color: '#F59E0B',
        boxShadow: '0 0 12px rgba(245,158,11,0.1)',
      }}
      animate={{ boxShadow: ['0 0 12px rgba(245,158,11,0.1)', '0 0 20px rgba(245,158,11,0.2)', '0 0 12px rgba(245,158,11,0.1)'] }}
      transition={{ duration: 3, repeat: Infinity }}
    >
      <Trophy size={10} /> Top Rated
    </motion.div>
  );
}

/* ── Verified Badge ── */
function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <Shield size={9} /> Верифицирован
    </span>
  );
}

/* ── Lawyer Card ── */
function LawyerCard({ lawyer, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link to={`/lawyers/${lawyer.id}`} className="block">
        <div className="glass-card p-6 group cursor-pointer relative overflow-hidden border border-white/[0.06] hover:border-white/[0.14] transition-all duration-500">
          {/* Hover glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-white/[0.02] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <div className="relative z-10">
            {/* Top: Avatar + Name + Badges */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl chrome-gradient flex items-center justify-center text-obsidian-950 font-bold text-xl shadow-lg flex-shrink-0">
                {lawyer.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white truncate group-hover:text-chrome-100 transition-colors">{lawyer.name}</h3>
                <p className="text-xs text-steel-400 mt-0.5">{lawyer.specialization}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {lawyer.is_top_rated && <TopRatedBadge />}
                  {lawyer.verified && <VerifiedBadge />}
                </div>
              </div>
              <WinRateRing rate={lawyer.win_rate} />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 rounded-xl bg-obsidian-800/50 border border-white/[0.04]">
                <div className="text-sm font-bold text-white">{lawyer.rating.toFixed(1)}</div>
                <div className="text-[10px] text-steel-500 flex items-center justify-center gap-0.5">
                  <Star size={8} className="text-amber-400" fill="currentColor" /> Рейтинг
                </div>
              </div>
              <div className="text-center p-2 rounded-xl bg-obsidian-800/50 border border-white/[0.04]">
                <div className="text-sm font-bold text-white">{lawyer.cases_won}</div>
                <div className="text-[10px] text-steel-500">Побед</div>
              </div>
              <div className="text-center p-2 rounded-xl bg-obsidian-800/50 border border-white/[0.04]">
                <div className="text-sm font-bold text-white">{lawyer.review_count}</div>
                <div className="text-[10px] text-steel-500">Отзывов</div>
              </div>
            </div>

            {/* Bottom: City + Experience */}
            <div className="flex items-center justify-between text-xs text-steel-400">
              <div className="flex items-center gap-3">
                {lawyer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {lawyer.city}
                  </span>
                )}
                {lawyer.experience_years > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {lawyer.experience_years} лет
                  </span>
                )}
              </div>
              <ChevronRight size={14} className="text-chrome-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Main Page ── */
export default function LawyerMarketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ city: '', specialization: '' });
  const [specializations, setSpecializations] = useState([]);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const cities = ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Тараз', 'Павлодар', 'Атырау'];

  useEffect(() => {
    loadSpecializations();
    loadLawyers();
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
      setLawyers(data.lawyers);
      setTotal(data.total);
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

  const clearFilters = () => {
    setSearch('');
    setFilters({ city: '', specialization: '' });
    loadLawyers({ q: undefined, city: undefined, specialization: undefined });
  };

  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-obsidian-950">
      {/* Header */}
      <div className="border-b border-white/[0.04] bg-obsidian-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => {
                if (user?.role === 'lawyer') navigate('/lawyer');
                else if (user) navigate('/dashboard');
                else navigate('/');
              }} 
              className="flex items-center gap-2 text-steel-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium tracking-wide">В кабинет</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-chrome-500/20 border border-chrome-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <Scale size={24} className="text-chrome-300" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Маркетплейс <span className="text-chrome-400">Юристов</span></h1>
                <p className="text-sm text-steel-400">Проверенные специалисты для вашего дела</p>
              </div>
            </div>
            <div className="w-20" /> {/* Spacer for balance */}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-steel-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени юриста..."
                className="input-field pl-11 pr-4"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary px-4 py-3 flex items-center gap-2 relative ${showFilters ? 'border-chrome-400/50' : ''}`}
            >
              <Filter size={16} /> Фильтры
              {activeFilters > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-chrome-300 text-obsidian-950 text-[10px] font-bold flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
            <button type="submit" className="btn-primary px-6 py-3">
              Найти
            </button>
          </form>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 rounded-xl bg-obsidian-900/60 border border-white/[0.06] flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-steel-400 font-medium mb-1.5 uppercase tracking-wider">Город</label>
                    <CustomSelect
                      value={filters.city}
                      onChange={(e) => setFilters({...filters, city: e.target.value})}
                      options={[
                        { value: '', label: 'Все города' },
                        ...cities.map(c => ({ value: c, label: c }))
                      ]}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-steel-400 font-medium mb-1.5 uppercase tracking-wider">Специализация</label>
                    <CustomSelect
                      value={filters.specialization}
                      onChange={(e) => setFilters({...filters, specialization: e.target.value})}
                      options={[
                        { value: '', label: 'Все специализации' },
                        ...specializations.map(s => ({ value: s.name_ru, label: s.name_ru }))
                      ]}
                    />
                  </div>
                  {activeFilters > 0 && (
                    <button onClick={clearFilters} className="text-xs text-steel-400 hover:text-white transition-colors flex items-center gap-1 pb-3">
                      <X size={12} /> Сбросить
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-obsidian-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-obsidian-700 rounded w-2/3" />
                    <div className="h-3 bg-obsidian-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : lawyers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-obsidian-800 flex items-center justify-center mx-auto mb-6">
              <Users size={32} className="text-steel-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Юристы не найдены</h3>
            <p className="text-steel-400 text-sm">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lawyers.map((lawyer, i) => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
