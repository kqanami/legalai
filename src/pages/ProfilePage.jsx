import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ShieldCheck, KeyRound, Smartphone, Mail, Globe, LogOut, Briefcase, ArrowUpRight, Zap, Database, Copy, Check } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import { FadeUp } from '../components/ui/animations';

const plans = {
  FREEMIUM: { name: 'FREEMIUM', limit: '3 премиум', model: 'Sonnet 3.5' },
  GO: { name: 'GO', monthlyPrice: '5,000', limit: '20 / день', model: 'Haiku' },
  ИП: { name: 'ИП', monthlyPrice: '19,990', limit: '15 / мес', model: 'Sonnet' },
  БИЗНЕС: { name: 'БИЗНЕС', monthlyPrice: '50,000', limit: 'Безлимит', model: 'Opus' }
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentPlan = user?.plan ? plans[user.plan.toUpperCase()] || plans.FREEMIUM : plans.FREEMIUM;

  const handleCopyApi = () => {
    navigator.clipboard.writeText('sk-live-a7F9x0qP2mN4vB8cE1wR5tY');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 pb-20 text-white font-sans">
      
      {/* Header & User Info - Compact */}
      <FadeUp className="mb-8">
        <div className="bg-neutral-950 border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5 z-10">
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-white text-black flex items-center justify-center text-2xl font-bold shadow-lg">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-neutral-950 rounded-full"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight mb-0.5">{user?.name}</h1>
              <div className="flex items-center gap-4 text-xs text-neutral-500 font-medium">
                <span className="flex items-center gap-1"><Smartphone size={12}/> {user?.phone || 'Нет телефона'}</span>
                <span className="flex items-center gap-1"><Mail size={12}/> {user?.email || 'Не указан'}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="z-10 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 rounded-lg text-xs font-semibold transition-all active:scale-95"
          >
            <LogOut size={14} /> Выйти
          </button>
        </div>
      </FadeUp>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Plan Card */}
        <FadeUp delay={0.1}>
          <div className="bg-neutral-950 border border-white/5 rounded-2xl p-6 h-full flex flex-col hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xs text-neutral-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck size={14} /> Текущий Тариф
                </h2>
                <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest">
                  {currentPlan.name}
                </div>
              </div>
              <button 
                onClick={() => setIsPaymentOpen(true)}
                className="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors shadow-sm"
              >
                Улучшить
              </button>
            </div>
            
            <div className="space-y-4 mt-auto">
              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                    <Zap size={12} className="text-white" /> Запросы
                  </span>
                  <span className="text-xs font-bold">12 / {currentPlan.limit.split('/')[0].trim()}</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 1 }} className="h-full bg-white" />
                </div>
              </div>
              {(currentPlan.name === 'ИП' || currentPlan.name === 'БИЗНЕС') && (
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                      <Database size={12} className="text-white" /> Аудиты
                    </span>
                    <span className="text-xs font-bold">2 / 15</span>
                  </div>
                  <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '15%' }} transition={{ duration: 1 }} className="h-full bg-neutral-500" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </FadeUp>

        {/* API Key */}
        <FadeUp delay={0.2}>
          <div className="bg-neutral-950 border border-white/5 rounded-2xl p-6 h-full flex flex-col hover:border-white/10 transition-colors">
            <h3 className="text-xs text-neutral-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <KeyRound size={14} /> API Интеграция
            </h3>
            <p className="text-[11px] text-neutral-500 mb-4 leading-relaxed">
              API-ключ для интеграции LegalAI в ваши внутренние системы (CRM, ERP).
            </p>
            
            <div className="mt-auto">
              <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1 block">Live API Key</label>
              <div className="flex items-center gap-2 p-1 bg-black border border-white/10 rounded-lg">
                <div className="flex-1 px-2 text-xs text-neutral-400 font-mono truncate">
                  sk-live-*********************
                </div>
                <button 
                  onClick={handleCopyApi}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors"
                  title="Копировать"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Escalations / Cases (Full Width) */}
        <FadeUp delay={0.3} className="md:col-span-2">
          <div className="bg-neutral-950 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xs text-neutral-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Briefcase size={14} /> {user?.role === 'lawyer' ? 'Эскалации' : 'Мои Эскалации'}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Сложные вопросы, требующие внимания специалиста.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mock Item 1 */}
              <div className="group bg-black border border-white/5 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-white/20 transition-all hover:bg-white/5">
                <div>
                  <p className="text-sm font-semibold mb-0.5 text-white">Раздел имущества</p>
                  <p className="text-[10px] text-neutral-500 font-mono">#4092 • В работе</p>
                </div>
                <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-neutral-400 group-hover:bg-white group-hover:text-black transition-colors">
                  <ArrowUpRight size={14} />
                </div>
              </div>
              
              {/* Mock Item 2 */}
              <div className="group bg-black border border-white/5 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-white/20 transition-all hover:bg-white/5">
                <div>
                  <p className="text-sm font-semibold mb-0.5 text-white">Аудит ВЭД контракта</p>
                  <p className="text-[10px] text-neutral-500 font-mono">#3911 • Завершено</p>
                </div>
                <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-neutral-400 group-hover:bg-white group-hover:text-black transition-colors">
                  <ArrowUpRight size={14} />
                </div>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Localization (Full Width) */}
        <FadeUp delay={0.4} className="md:col-span-2">
          <div className="bg-neutral-950 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center">
                <Globe size={14} className="text-neutral-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">Язык интерфейса</h3>
                <p className="text-[10px] text-neutral-500 font-medium">Выберите удобный язык для работы</p>
              </div>
            </div>
            
            <div className="flex bg-black p-1 rounded-lg border border-white/10">
              <button
                onClick={() => setLanguage('ru')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                  language === 'ru' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-white'
                }`}
              >
                Рус
              </button>
              <button
                onClick={() => setLanguage('kz')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                  language === 'kz' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-white'
                }`}
              >
                Қаз
              </button>
            </div>
          </div>
        </FadeUp>

      </div>

      <PaymentModal 
        isOpen={isPaymentOpen} 
        onClose={() => setIsPaymentOpen(false)} 
        selectedPlan={plans.БИЗНЕС}
        isYearly={false}
      />
    </div>
  );
}
