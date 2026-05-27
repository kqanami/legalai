import { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { lawyerApi } from '../services/api';
import { motion } from 'framer-motion';
import { Users, Briefcase, FileText, Activity, Star, Trophy, TrendingUp, Scale, Clock, ChevronRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
};

export default function LawyerDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await lawyerApi.getDashboardStats();
        setStats(data);
      } catch (e) {
        console.error("Failed to load lawyer stats", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Scale size={48} className="text-chrome-500 opacity-50" />
        </motion.div>
      </div>
    );
  }

  const winRateValue = stats?.cases_total > 0 ? Math.round((stats.cases_won / stats.cases_total) * 100) : 100;

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-8 min-h-full bg-transparent overflow-y-auto custom-scrollbar relative"
    >
      <div className="max-w-6xl mx-auto space-y-10 pb-20 relative z-10">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2 uppercase">
              Обзор <span className="text-chrome-500">Практики</span>
            </h1>
            <p className="text-neutral-500 font-bold tracking-widest text-[10px] uppercase">Аналитика, активные дела и производительность.</p>
          </div>
          <div className="flex gap-6 items-center">
            <div className="text-right">
              <div className="text-[9px] text-neutral-600 uppercase tracking-widest font-black mb-1">Win Rate</div>
              <div className="text-2xl font-black text-white">{winRateValue}%</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-right">
              <div className="text-[9px] text-neutral-600 uppercase tracking-widest font-black mb-1">Рейтинг</div>
              <div className="text-2xl font-black text-white flex items-center gap-1">
                {stats?.rating?.toFixed(1) || '5.0'} <Star size={16} fill="currentColor" className="text-chrome-500" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={<Trophy className="text-yellow-500" />} 
            title="Выиграно дел" 
            value={stats?.cases_won || 0} 
            subtitle={`Из ${stats?.cases_total || 0} всего`}
            trend="+12% за месяц"
            trendUp={true}
          />
          <StatCard 
            icon={<Briefcase className="text-chrome-400" />} 
            title="Активные дела" 
            value={stats?.active_cases || 0} 
            subtitle="В процессе"
            trend="Стабильно"
            trendUp={true}
          />
          <StatCard 
            icon={<Users className="text-blue-400" />} 
            title="Клиенты" 
            value={stats?.total_clients || 0} 
            subtitle="В базе данных"
            trend="+3 новых"
            trendUp={true}
          />
          <StatCard 
            icon={<Clock className="text-emerald-400" />} 
            title="Отклики" 
            value={`${stats?.response_time_hours || 0} ч`} 
            subtitle="Среднее время"
            trend="Высокая скорость"
            trendUp={true}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Cases */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-widest font-black text-white flex items-center gap-2">
                <Activity className="text-chrome-500" size={16} />
                Активные дела
              </h2>
              <Link to="/lawyer/cases" className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors flex items-center gap-1">
                Все дела <ChevronRight size={14} />
              </Link>
            </div>
            
            {Array.isArray(stats?.recent_cases) && stats.recent_cases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.recent_cases.map((c) => (
                  <div 
                    key={c.id} 
                    className="bg-[#111] p-5 rounded-2xl border border-white/5 hover:border-chrome-500/30 transition-all group relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/[0.02] to-transparent pointer-events-none group-hover:from-chrome-500/10 transition-colors" />
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[9px] uppercase tracking-widest font-black text-neutral-400 px-2 py-1 bg-white/5 rounded-md">
                          {c.category || 'Без категории'}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest font-black text-chrome-400 bg-chrome-500/10 px-2 py-1 rounded-md">
                          {c.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-white mb-2 leading-snug group-hover:text-chrome-300 transition-colors">{c.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mt-4 pt-4 border-t border-white/5">
                      <Users size={12} />
                      <span className="font-bold">{c.client?.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#111] p-10 rounded-2xl text-center border border-dashed border-white/10 flex flex-col items-center">
                <Briefcase size={32} className="text-neutral-600 mb-4" />
                <p className="text-neutral-400 font-bold text-sm uppercase tracking-widest">Нет активных дел</p>
                <Link to="/lawyer/cases" className="mt-4 text-xs font-black uppercase tracking-widest text-chrome-500 hover:text-white transition-colors">Создать дело</Link>
              </div>
            )}
          </motion.div>

          {/* Tools Section */}
          <motion.div variants={itemVariants} className="space-y-6">
            <h2 className="text-sm uppercase tracking-widest font-black text-white flex items-center gap-2">
              <Zap className="text-chrome-500" size={16} />
              Инструменты
            </h2>
            
            <div className="grid grid-cols-1 gap-3">
              <QuickActionCard 
                to="/lawyer/ai" 
                icon={<Scale size={20} />} 
                title="AI Ассистент" 
                desc="Анализ законов РК"
                color="chrome"
              />
              <QuickActionCard 
                to="/lawyer/leads" 
                icon={<Users size={20} />} 
                title="Новые заявки" 
                desc="Запросы от клиентов"
                color="blue"
              />
              <QuickActionCard 
                to="/lawyer/audit" 
                icon={<FileText size={20} />} 
                title="Аудит договоров" 
                desc="Поиск рисков"
                color="emerald"
              />
            </div>
            
            <div className="bg-[#111] p-6 rounded-2xl border border-white/5 relative overflow-hidden mt-6">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-chrome-500/10 blur-3xl rounded-full pointer-events-none" />
              <h3 className="font-black text-xs uppercase tracking-widest text-white mb-2 relative z-10">AI-Помощник активен</h3>
              <p className="text-xs font-bold text-neutral-500 mb-6 relative z-10">Нейросеть готова помочь с анализом НПА и подготовкой правовой позиции.</p>
              <Link to="/lawyer/ai" className="inline-block text-[10px] uppercase tracking-widest font-black text-black bg-white hover:bg-neutral-200 px-6 py-3 rounded-xl transition-colors relative z-10 w-full text-center">
                Открыть чат
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, title, value, subtitle, trend, trendUp }) {
  return (
    <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors relative overflow-hidden group">
      <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-white/[0.02] to-transparent rounded-bl-full pointer-events-none group-hover:from-chrome-500/10 transition-colors" />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="text-neutral-500 font-bold uppercase tracking-widest text-[9px]">{title}</div>
        <div className="text-white opacity-50 group-hover:opacity-100 transition-opacity">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-3 relative z-10">
        <div className="text-3xl font-black text-white tracking-tight">{value}</div>
        {trend && (
          <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${trendUp ? 'text-chrome-500' : 'text-red-500'} flex items-center gap-1`}>
            {trendUp ? <TrendingUp size={10} /> : null} {trend}
          </div>
        )}
      </div>
      {subtitle && <div className="text-[10px] text-neutral-600 mt-2 font-bold uppercase tracking-widest">{subtitle}</div>}
    </div>
  );
}

function QuickActionCard({ to, icon, title, desc, color }) {
  return (
    <Link to={to} className="bg-[#111] p-4 rounded-2xl border border-white/5 hover:bg-[#1a1a1a] transition-colors group flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-white/5 text-neutral-400 group-hover:text-white group-hover:bg-white/10 transition-colors`}>
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-sm text-white group-hover:text-chrome-300 transition-colors">{title}</h4>
        <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 mt-1 leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}
