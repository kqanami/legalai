import { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { lawyerApi } from '../services/api';
import { motion } from 'framer-motion';
import { Users, Briefcase, FileText, Activity, Star, Trophy } from 'lucide-react';

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

  if (loading) return <div className="p-8 text-steel-400">Загрузка данных рабочего пространства...</div>;

  return (
    <div className="p-8 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold mb-8 text-white tracking-tight">Обзор рабочего пространства</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard icon={<Trophy className="text-yellow-500" />} title="Выиграно дел" value={stats?.cases_won || 0} />
        <StatCard icon={<Star className="text-chrome-400" />} title="Рейтинг" value={stats?.rating?.toFixed(1) || '5.0'} />
        <StatCard icon={<Users className="text-blue-400" />} title="Клиенты" value={stats?.total_clients || 0} />
        <StatCard icon={<Briefcase className="text-emerald-400" />} title="Активные дела" value={stats?.active_cases || 0} />
      </div>

      <h2 className="text-xl font-bold mb-6 text-white">Последние дела</h2>
      {stats?.recent_cases?.length > 0 ? (
        <div className="space-y-4">
          {stats.recent_cases.map(c => (
            <div key={c.id} className="glass-card p-6 flex justify-between items-center hover:border-chrome-500/50 transition-colors cursor-pointer">
              <div>
                <h3 className="font-semibold text-lg text-white">{c.title}</h3>
                <p className="text-sm text-steel-400">{c.client?.name}</p>
              </div>
              <span className="px-3 py-1 bg-obsidian-800 text-chrome-300 text-xs rounded-full border border-obsidian-600">
                {c.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-steel-500 glass-card p-8 text-center border-dashed border-obsidian-600">
          У вас пока нет активных дел. Создайте карточку клиента, чтобы начать работу.
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <motion.div 
      className="glass-card p-6 border-l-2 border-chrome-500/50"
      whileHover={{ y: -5 }}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-obsidian-800 rounded-xl text-chrome-400">
          {icon}
        </div>
        <div className="text-steel-400 font-medium">{title}</div>
      </div>
      <div className="text-3xl font-bold text-white tracking-wider">{value}</div>
    </motion.div>
  );
}
