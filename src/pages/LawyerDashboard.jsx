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
      className="p-8 min-h-full bg-obsidian-950 overflow-y-auto custom-scrollbar relative"
    >
      <div className="max-w-6xl mx-auto space-y-10 pb-20 relative z-10">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              Обзор <span className="text-chrome-400">Практики</span>
            </h1>
            <p className="text-steel-400 font-medium tracking-wide">Аналитика, активные дела и производительность.</p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-[10px] text-steel-500 uppercase tracking-widest font-black mb-1 opacity-70">Win Rate</div>
              <div className="text-2xl font-black text-emerald-400">{winRateValue}%</div>
            </div>
            <div className="w-px h-10 bg-obsidian-800" />
            <div className="text-right">
              <div className="text-xs text-steel-500 uppercase tracking-widest font-bold mb-1">Рейтинг</div>
              <div className="text-2xl font-bold text-yellow-500 flex items-center gap-1">
                {stats?.rating?.toFixed(1) || '5.0'} <Star size={16} fill="currentColor" />
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
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="text-chrome-400" size={20} />
                Активные дела
              </h2>
              <Link to="/lawyer/cases" className="text-sm font-medium text-steel-400 hover:text-chrome-300 flex items-center gap-1 transition-colors">
                Все дела <ChevronRight size={16} />
              </Link>
            </div>
            
            {Array.isArray(stats?.recent_cases) && stats.recent_cases.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_cases.map((c) => (
                  <div 
                    key={c.id} 
                    className="glass-card p-5 border border-obsidian-700/50 hover:border-chrome-500/50 transition-colors group relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-chrome-400 to-obsidian-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-steel-500 px-2 py-0.5 bg-obsidian-800 rounded border border-obsidian-700">
                        {c.category || 'Без категории'}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">
                        {c.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-white mb-1 group-hover:text-chrome-300 transition-colors">{c.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-steel-400 mt-4 pt-4 border-t border-obsidian-700/50">
                      <Users size={14} />
                      <span className="font-medium text-steel-300">{c.client?.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-10 text-center border-dashed border-obsidian-700 flex flex-col items-center">
                <Briefcase size={40} className="text-obsidian-600 mb-4" />
                <p className="text-steel-400 font-medium">Нет активных дел</p>
                <Link to="/lawyer/cases" className="mt-4 text-sm text-chrome-400 hover:text-chrome-300 underline underline-offset-4">Создать дело</Link>
              </div>
            )}
          </motion.div>

          {/* Tools Section */}
          <motion.div variants={itemVariants} className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="text-chrome-400" size={20} />
              Инструменты
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              <QuickActionCard 
                to="/lawyer/ai" 
                icon={<Scale size={24} />} 
                title="AI Ассистент" 
                desc="Поиск прецедентов и анализ законов РК"
                color="chrome"
              />
              <QuickActionCard 
                to="/lawyer/leads" 
                icon={<Users size={24} />} 
                title="Новые заявки" 
                desc="Входящие запросы от клиентов"
                color="blue"
              />
              <QuickActionCard 
                to="/lawyer/audit" 
                icon={<FileText size={24} />} 
                title="Аудит договоров" 
                desc="Автоматический поиск рисков"
                color="emerald"
              />
            </div>
            
            <div className="glass-card p-6 border border-obsidian-700/50 bg-obsidian-900/40 relative overflow-hidden mt-6">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-chrome-500/10 blur-3xl rounded-full pointer-events-none" />
              <h3 className="font-bold text-white mb-2 relative z-10">AI-Помощник активен</h3>
              <p className="text-sm text-steel-400 mb-4 relative z-10">Нейросеть готова помочь с анализом НПА и подготовкой правовой позиции.</p>
              <Link to="/lawyer/ai" className="inline-block text-sm font-bold text-obsidian-950 bg-chrome-500 hover:bg-chrome-400 px-4 py-2 rounded-lg transition-colors relative z-10 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                Открыть чат
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, title, value, subtitle, trend, trendUp }) {
  return (
    <div className="glass-card p-6 border-t border-obsidian-700/50 hover:border-chrome-500/30 transition-colors relative overflow-hidden group">
      <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-chrome-500/10 transition-colors" />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="text-steel-400 font-medium tracking-wide text-sm">{title}</div>
        <div className="p-2.5 bg-obsidian-800 rounded-xl shadow-inner border border-obsidian-700">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-3 relative z-10">
        <div className="text-3xl font-black text-white tracking-tight">{value}</div>
        {trend && (
          <div className={`text-xs font-bold mb-1 ${trendUp ? 'text-emerald-400' : 'text-red-400'} flex items-center gap-1`}>
            {trendUp ? <TrendingUp size={12} /> : null} {trend}
          </div>
        )}
      </div>
      {subtitle && <div className="text-xs text-steel-500 mt-2 font-medium">{subtitle}</div>}
    </div>
  );
}

function QuickActionCard({ to, icon, title, desc, color }) {
  const colorMap = {
    chrome: 'text-chrome-400 group-hover:text-chrome-300 bg-chrome-500/10 border-chrome-500/20',
    blue: 'text-blue-400 group-hover:text-blue-300 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 group-hover:text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <Link to={to} className="glass-card p-4 border border-obsidian-700/50 hover:bg-obsidian-800 transition-colors group flex items-center gap-4">
      <div className={`p-3 rounded-xl border transition-colors ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-white group-hover:text-chrome-300 transition-colors">{title}</h4>
        <p className="text-xs text-steel-400 mt-1 leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}
