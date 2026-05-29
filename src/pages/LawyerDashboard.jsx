import { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { lawyerApi } from '../services/api';
import { motion } from 'framer-motion';
import { Users, Briefcase, FileText, Activity, Star, Trophy, TrendingUp, Scale, Clock, ChevronRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
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
      <div className="h-full flex flex-col bg-[#050505] items-center justify-center p-8">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Scale size={48} className="text-white/20" />
        </motion.div>
      </div>
    );
  }

  const winRateValue = stats?.cases_total > 0 ? Math.round((stats.cases_won / stats.cases_total) * 100) : 100;

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden p-6 lg:p-10 selection:bg-white/20 font-sans">
      <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-6xl mx-auto space-y-10 pb-20 relative z-10"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">
                Обзор Практики
              </h1>
              <p className="text-white/40 font-bold tracking-widest text-[10px] uppercase">Аналитика, активные дела и производительность.</p>
            </div>
            <div className="flex gap-6 items-center">
              <div className="text-right">
                <div className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-1">Win Rate</div>
                <div className="text-3xl font-black text-white">{winRateValue}%</div>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="text-right">
                <div className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-1">Рейтинг</div>
                <div className="text-3xl font-black text-white flex items-center gap-2">
                  {stats?.rating?.toFixed(1) || '5.0'} <Star size={20} fill="currentColor" className="text-white" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={<Trophy size={20} />} 
              title="Выиграно дел" 
              value={stats?.cases_won || 0} 
              subtitle={`Из ${stats?.cases_total || 0} всего`}
              trend="+12% за месяц"
              trendUp={true}
            />
            <StatCard 
              icon={<Briefcase size={20} />} 
              title="Активные дела" 
              value={stats?.active_cases || 0} 
              subtitle="В процессе"
              trend="Стабильно"
              trendUp={true}
            />
            <StatCard 
              icon={<Users size={20} />} 
              title="Клиенты" 
              value={stats?.total_clients || 0} 
              subtitle="В базе данных"
              trend="+3 новых"
              trendUp={true}
            />
            <StatCard 
              icon={<Clock size={20} />} 
              title="Отклики" 
              value={`${stats?.response_time_hours || 0} ч`} 
              subtitle="Среднее время"
              trend="Высокая скорость"
              trendUp={true}
            />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Cases */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] uppercase tracking-widest font-black text-white/40 flex items-center gap-2">
                  <Activity size={14} />
                  Активные дела
                </h2>
                <Link to="/lawyer/cases" className="h-8 px-4 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-[9px] font-black uppercase tracking-widest text-white transition-colors flex items-center gap-1">
                  Все дела <ChevronRight size={12} />
                </Link>
              </div>
              
              {Array.isArray(stats?.recent_cases) && stats.recent_cases.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.recent_cases.map((c) => (
                    <div 
                      key={c.id} 
                      className="bg-white/[0.01] p-6 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-[9px] uppercase tracking-widest font-black text-white/40 px-3 py-1 bg-[#050505] border border-white/5 rounded-full">
                            {c.category || 'Без категории'}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest font-black text-black bg-white px-3 py-1 rounded-full">
                            {c.status}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-white mb-2 leading-snug group-hover:text-white/70 transition-colors">{c.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-white/40 mt-4 pt-4 border-t border-white/5">
                        <Users size={12} />
                        <span className="font-bold uppercase tracking-widest">{c.client?.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/[0.01] p-10 rounded-[2rem] text-center border border-dashed border-white/5 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-white/[0.02] flex items-center justify-center mb-4">
                    <Briefcase size={24} className="text-white/20" />
                  </div>
                  <p className="text-white/40 font-black text-[10px] uppercase tracking-widest">Нет активных дел</p>
                  <Link to="/lawyer/cases" className="mt-4 h-10 px-6 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center">Создать дело</Link>
                </div>
              )}
            </motion.div>

            {/* Tools Section */}
            <motion.div variants={itemVariants} className="space-y-6">
              <h2 className="text-[10px] uppercase tracking-widest font-black text-white/40 flex items-center gap-2">
                <Zap size={14} />
                Инструменты
              </h2>
              
              <div className="grid grid-cols-1 gap-3">
                <QuickActionCard 
                  to="/lawyer/ai" 
                  icon={<Scale size={16} />} 
                  title="AI Ассистент" 
                  desc="Анализ законов РК"
                />
                <QuickActionCard 
                  to="/lawyer/leads" 
                  icon={<Users size={16} />} 
                  title="Новые заявки" 
                  desc="Запросы от клиентов"
                />
                <QuickActionCard 
                  to="/lawyer/audit" 
                  icon={<FileText size={16} />} 
                  title="Аудит договоров" 
                  desc="Поиск рисков"
                />
              </div>
              
              <div className="bg-white/[0.01] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden mt-6">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-white mb-2 relative z-10">AI-Помощник активен</h3>
                <p className="text-[11px] font-bold text-white/40 mb-6 relative z-10">Нейросеть готова помочь с анализом НПА и подготовкой правовой позиции.</p>
                <Link to="/lawyer/ai" className="inline-flex h-12 items-center justify-center text-[10px] uppercase tracking-widest font-black text-black bg-white hover:bg-neutral-200 px-6 rounded-xl transition-colors relative z-10 w-full text-center">
                  Открыть чат
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, trend, trendUp }) {
  return (
    <div className="bg-white/[0.01] p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors relative group">
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="text-white/40 font-black uppercase tracking-widest text-[9px]">{title}</div>
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white opacity-50 group-hover:opacity-100 transition-opacity">
          {icon}
        </div>
      </div>
      <div className="flex flex-col gap-1 relative z-10">
        <div className="text-4xl font-black text-white tracking-tight">{value}</div>
        {trend && (
          <div className={`text-[9px] font-black uppercase tracking-widest mt-2 flex items-center gap-1 ${trendUp ? 'text-white' : 'text-white/50'}`}>
            {trendUp ? <TrendingUp size={10} /> : null} {trend}
          </div>
        )}
      </div>
      {subtitle && <div className="text-[9px] text-white/40 mt-3 font-black uppercase tracking-widest">{subtitle}</div>}
    </div>
  );
}

function QuickActionCard({ to, icon, title, desc }) {
  return (
    <Link to={to} className="bg-white/[0.01] p-4 rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-colors group flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-[#050505] border border-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors`}>
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-sm text-white group-hover:text-white/80 transition-colors">{title}</h4>
        <p className="text-[9px] uppercase font-black tracking-widest text-white/40 mt-1 leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}
