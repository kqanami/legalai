import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ShieldCheck, KeyRound, Smartphone, Mail, Globe, LogOut, Briefcase, ArrowUpRight, Zap, Database, Copy, Check } from 'lucide-react';

const plans = {
  freemium: { name: 'FREEMIUM', limit: '3 премиум', model: 'Sonnet 3.5' },
  go: { name: 'GO', monthlyPrice: '5,000', limit: '20 / день', model: 'Haiku' },
  ip: { name: 'ИП', monthlyPrice: '19,990', limit: '15 / мес', model: 'Sonnet' },
  business: { name: 'БИЗНЕС', monthlyPrice: '50,000', limit: 'Безлимит', model: 'Opus' }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { lang, switchLanguage } = useLanguage();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const currentPlan = user?.plan ? plans[user.plan.toLowerCase()] || plans.freemium : plans.freemium;

  const handleCopyApi = () => {
    navigator.clipboard.writeText('sk-live-a7F9x0qP2mN4vB8cE1wR5tY');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden p-6 lg:p-10 selection:bg-white/20 font-sans">
      <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto pb-8 flex flex-col gap-6">
          
          {/* Header & User Info */}
          <motion.div variants={itemVariants} className="bg-white/[0.01] border border-white/5 rounded-[2rem] p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
            <div className="flex items-center gap-6 z-10">
              <div className="relative">
                <div className="w-20 h-20 rounded-[1.5rem] bg-white text-black flex items-center justify-center text-3xl font-black">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-[#050505] rounded-full"></div>
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight mb-2">{user?.name}</h1>
                <div className="flex items-center gap-4 text-[11px] font-bold text-white/40 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Smartphone size={14}/> {user?.phone || 'Нет телефона'}</span>
                  <span className="flex items-center gap-1.5"><Mail size={14}/> {user?.email || 'Не указан'}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={logout}
              className="z-10 flex items-center gap-2 h-12 px-6 bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 rounded-2xl text-xs font-bold transition-all"
            >
              <LogOut size={16} /> Выйти
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Plan Card */}
            <motion.div variants={itemVariants} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 lg:p-8 flex flex-col hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer relative overflow-hidden">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-[10px] text-white/40 font-black uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <ShieldCheck size={14} /> Текущий Тариф
                  </h2>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest">
                    {currentPlan.name}
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/pricing')}
                  className="h-9 px-4 rounded-xl bg-white/[0.05] text-white border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.1] transition-colors"
                >
                  Улучшить
                </button>
              </div>
              
              <div className="space-y-6 mt-auto">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[11px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Zap size={14} className="text-white" /> Запросы
                    </span>
                    <span className="text-xs font-black">12 / {currentPlan.limit.split('/')[0].trim()}</span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden border border-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 1, type: 'spring' }} className="h-full bg-white" />
                  </div>
                </div>
                {(currentPlan.name === 'ИП' || currentPlan.name === 'БИЗНЕС') && (
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[11px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Database size={14} className="text-white" /> Аудиты
                      </span>
                      <span className="text-xs font-black">2 / 15</span>
                    </div>
                    <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden border border-white/5">
                      <motion.div initial={{ width: 0 }} animate={{ width: '15%' }} transition={{ duration: 1, type: 'spring' }} className="h-full bg-white/40" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* API Key */}
            <motion.div variants={itemVariants} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 lg:p-8 flex flex-col hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer relative overflow-hidden">
              <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <KeyRound size={14} /> API Интеграция
              </h3>
              <p className="text-sm text-white/60 mb-6 leading-relaxed">
                API-ключ для интеграции LegalAI в ваши внутренние системы (CRM, ERP).
              </p>
              
              <div className="mt-auto">
                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 block">Live API Key</label>
                <div className="flex items-center gap-2 p-1 bg-[#050505] border border-white/10 rounded-2xl h-14">
                  <div className="flex-1 px-4 text-xs text-white/60 font-mono truncate">
                    sk-live-*********************
                  </div>
                  <button 
                    onClick={handleCopyApi}
                    className="w-12 h-12 flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] rounded-xl text-white transition-colors"
                    title="Копировать"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Escalations / Cases */}
            <motion.div variants={itemVariants} className="md:col-span-2 bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 lg:p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer relative overflow-hidden">
              <div className="mb-6">
                <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Briefcase size={14} /> {user?.role === 'lawyer' ? 'Эскалации' : 'Мои Эскалации'}
                </h3>
                <p className="text-sm text-white/60">
                  Сложные вопросы, требующие внимания специалиста.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="group bg-[#050505] border border-white/5 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-white/20 transition-all hover:bg-white/[0.02]">
                  <div>
                    <p className="text-sm font-bold mb-1 text-white">Раздел имущества</p>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">#4092 • В работе</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/40 group-hover:bg-white group-hover:text-black transition-colors">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
                
                <div className="group bg-[#050505] border border-white/5 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-white/20 transition-all hover:bg-white/[0.02]">
                  <div>
                    <p className="text-sm font-bold mb-1 text-white">Аудит ВЭД контракта</p>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">#3911 • Завершено</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/40 group-hover:bg-white group-hover:text-black transition-colors">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Localization */}
            <motion.div variants={itemVariants} className="md:col-span-2 bg-white/[0.01] border border-white/5 rounded-[2rem] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] hover:border-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                  <Globe size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Язык интерфейса</h3>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Выберите удобный язык для работы</p>
                </div>
              </div>
              
              <div className="flex bg-[#050505] p-1 rounded-2xl border border-white/5 h-12 items-center px-1 shrink-0">
                <button
                  onClick={() => switchLanguage('ru')}
                  className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    lang === 'ru' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Русский
                </button>
                <button
                  onClick={() => switchLanguage('kz')}
                  className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    lang === 'kz' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Қазақша
                </button>
              </div>
            </motion.div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
