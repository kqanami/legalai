import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { User, ShieldCheck, KeyRound, Smartphone, Mail, FileText, Globe, LogOut } from 'lucide-react';

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

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 mt-6 pb-20">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl chrome-gradient shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <User className="text-obsidian-950" size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{t('nav_profile')}</h1>
              <p className="text-steel-400 text-sm mt-1">{t('dashboard_welcome')}, {user?.name}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl text-sm font-semibold transition-colors shadow-sm active:scale-95"
          >
            <LogOut size={16} /> Выйти
          </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main User Info Card */}
          <motion.div variants={itemVariants} className="md:col-span-2 glass-card p-6 border border-obsidian-700/80 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-chrome-500/5 rounded-bl-[100px] -z-10 group-hover:bg-chrome-500/10 transition-colors duration-500"></div>
            
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <FileText size={18} className="text-chrome-400" /> Основная информация
            </h2>

            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full chrome-gradient flex items-center justify-center shadow-inner shadow-white/20 border-2 border-obsidian-800">
                  <span className="text-obsidian-950 font-bold text-3xl">{user?.name?.charAt(0) || 'U'}</span>
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-2 border-obsidian-900 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              </div>

              <div className="space-y-4 flex-1 w-full">
                <div>
                  <label className="text-xs text-steel-500 uppercase tracking-wider font-semibold">ФИО</label>
                  <p className="text-white font-medium text-lg mt-1 pb-2 border-b border-obsidian-700">{user?.name}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-steel-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <Smartphone size={12} /> Телефон
                    </label>
                    <p className="text-steel-300 font-medium mt-1">{user?.phone || '+7 (---) --- -- --'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-steel-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <Mail size={12} /> Email
                    </label>
                    <p className="text-steel-300 font-medium mt-1">Не указан</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Subscription / Plan Card */}
          <motion.div variants={itemVariants} className="glass-card p-6 border border-obsidian-700/80 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-chrome-500/5 to-transparent z-0"></div>
            <div className="relative z-10 h-full flex flex-col">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <ShieldCheck size={18} className="text-chrome-400" /> Тарифный план
              </h2>
              
              <div className="mt-4 flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-chrome-500/20 border border-chrome-500/30 text-chrome-200 text-[10px] font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                  {user?.plan || 'FREEMIUM'}
                </div>
                <p className="text-xs text-steel-400 leading-relaxed mb-4">
                  {user?.plan === 'business' ? 'Доступ к Deep Smart Audit и Opus ИИ.' : 
                   user?.plan === 'go' ? 'Безлимитный чат на модели Claude 3.5 Sonnet.' :
                   '3 премиум-ответа, далее — чат на базовой модели.'}
                </p>
                
                <div className="space-y-2 mt-auto">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-steel-500 uppercase tracking-tighter">Лимит ИИ:</span>
                    <span className="text-white font-mono font-bold">
                      {user?.plan === 'go' ? '50 / день' : user?.plan === 'freemium' ? '3 премиум' : 'Безлимит'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-steel-500 uppercase tracking-tighter">Интеллект:</span>
                    <span className="text-white font-mono font-bold">
                      {user?.plan === 'business' ? 'Claude Opus' : 'Sonnet 3.5'}
                    </span>
                  </div>
                </div>
              </div>

              <button className="w-full mt-6 py-2.5 rounded-xl chrome-gradient text-obsidian-950 text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg">
                Обновить тариф
              </button>
            </div>
          </motion.div>

          {/* Settings & Security */}
          <motion.div variants={itemVariants} className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Preferences */}
            <div className="glass-card p-6 border border-obsidian-700/80 hover:border-obsidian-600 transition-colors">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Globe size={18} className="text-steel-400" /> Язык и локализация
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">Язык интерфейса</p>
                  <p className="text-xs text-steel-500 mt-1">Выберите предпочитаемый язык для работы системы.</p>
                </div>
                <div className="flex bg-obsidian-900 rounded-lg p-1 border border-obsidian-700">
                  <button
                    onClick={() => setLanguage('ru')}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
                      language === 'ru' ? 'bg-obsidian-700 text-white shadow-sm' : 'text-steel-500 hover:text-white'
                    }`}
                  >
                    Рус
                  </button>
                  <button
                    onClick={() => setLanguage('kz')}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
                      language === 'kz' ? 'bg-obsidian-700 text-white shadow-sm' : 'text-steel-500 hover:text-white'
                    }`}
                  >
                    Қаз
                  </button>
                </div>
              </div>
            </div>

            {/* API Settings */}
            <div className="glass-card p-6 border border-obsidian-700/80 hover:border-obsidian-600 transition-colors">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <KeyRound size={18} className="text-steel-400" /> API Интеграция
              </h3>
              <p className="text-xs text-steel-400 mb-4">
                Используйте API-ключ для интеграции AI-Юриста в ваши внутренние системы (CRM, ERP).
              </p>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-obsidian-900 border border-obsidian-700 rounded-lg px-3 py-2 text-steel-500 font-mono text-xs flex items-center">
                  sk-live-***************************
                </div>
                <button className="px-4 py-2 bg-chrome-100/10 hover:bg-white border border-chrome-500/30 hover:border-white text-chrome-200 hover:text-obsidian-950 text-xs font-bold rounded-lg transition-all active:scale-95 shadow-sm">
                  Регенерировать
                </button>
              </div>
            </div>

          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
