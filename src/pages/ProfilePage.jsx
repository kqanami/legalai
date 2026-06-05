import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  ShieldCheck, KeyRound, Smartphone, Mail, Globe, LogOut, 
  Briefcase, ArrowUpRight, Zap, Database, Copy, Check, 
  Edit3, ShieldAlert, CreditCard, Clock, Activity, AlertCircle, Save, X
} from 'lucide-react';

const plans = {
  freemium: { name: 'FREEMIUM', limit: '3 премиум', maxReq: 12, maxDoc: 0, model: 'Sonnet 3.5' },
  go: { name: 'GO', monthlyPrice: '5,000', limit: '20 / день', maxReq: 20, maxDoc: 2, model: 'Haiku' },
  ip: { name: 'ИП', monthlyPrice: '19,990', limit: '15 / мес', maxReq: 100, maxDoc: 15, model: 'Sonnet' },
  business: { name: 'БИЗНЕС', monthlyPrice: '50,000', limit: 'Безлимит', maxReq: 999, maxDoc: 100, model: 'Opus' }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

export default function ProfilePage() {
  const { user, logout, updateProfile, generateApiKey, toggle2fa } = useAuth();
  const { lang, switchLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', city: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Setup form
  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        city: user.city || ''
      });
    }
  }, [user]);

  const currentPlan = user?.plan ? plans[user.plan.toLowerCase()] || plans.freemium : plans.freemium;

  const handleCopyApi = () => {
    const key = user?.api_key || 'sk-live-*************************';
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateKey = async () => {
    try {
      await generateApiKey();
    } catch (e) {
      console.error(e);
      alert('Ошибка при генерации ключа');
    }
  };

  const handleToggle2FA = async () => {
    try {
      await toggle2fa();
    } catch (e) {
      console.error(e);
      alert('Ошибка при изменении настроек безопасности');
    }
  };

  const handleSaveProfile = async () => {
    setErrorMsg('');
    setIsSaving(true);
    try {
      await updateProfile(editForm);
      setIsEditing(false);
    } catch (e) {
      setErrorMsg(e.message || 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  const currentReq = 12; // Mock usage
  const reqPercent = Math.min((currentReq / (currentPlan.maxReq || 1)) * 100, 100);
  
  const currentDoc = 2; // Mock usage
  const docPercent = currentPlan.maxDoc > 0 ? Math.min((currentDoc / currentPlan.maxDoc) * 100, 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[#030303] text-white overflow-hidden p-4 md:p-8 lg:p-10 font-sans selection:bg-emerald-500/30">
      <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2 pb-24">
        
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto flex flex-col gap-6">
          
          {/* Header row: User Profile & Security */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* User Profile Card */}
            <motion.div variants={itemVariants} className="lg:col-span-2 relative bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 overflow-hidden group">
              {/* Subtle gradient background */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity duration-1000 group-hover:opacity-100 opacity-50" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-6 w-full">
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 text-white flex items-center justify-center text-4xl font-black shadow-2xl backdrop-blur-md">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-[#0A0A0A] rounded-full animate-pulse"></div>
                  </div>
                  
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-3 w-full max-w-sm">
                        <input 
                          type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xl font-bold focus:outline-none focus:border-emerald-500/50 transition-colors"
                          placeholder="Имя"
                        />
                        <input 
                          type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                          placeholder="Телефон"
                        />
                        <input 
                          type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                          placeholder="Email"
                        />
                        {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
                        <div className="flex gap-2 mt-2">
                          <button onClick={handleSaveProfile} disabled={isSaving} className="flex-1 bg-emerald-500 text-black font-bold text-xs py-2 rounded-xl hover:bg-emerald-400 transition-colors flex justify-center items-center gap-2">
                            {isSaving ? 'Сохранение...' : <><Save size={14}/> Сохранить</>}
                          </button>
                          <button onClick={() => setIsEditing(false)} className="px-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors">
                            <X size={16}/>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="text-3xl font-black tracking-tight">{user?.name}</h1>
                          <button onClick={() => setIsEditing(true)} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                            <Edit3 size={16} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs font-medium text-white/50">
                          <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><Smartphone size={14}/> {user?.phone || 'Нет телефона'}</span>
                          <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><Mail size={14}/> {user?.email || 'Нет email'}</span>
                          <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><Globe size={14}/> {user?.city || 'Казахстан'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions & Security */}
            <motion.div variants={itemVariants} className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" /> Безопасность
                </h3>
              </div>
              
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${user?.two_factor_enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-white/40'}`}>
                      <KeyRound size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">2FA Авторизация</p>
                      <p className="text-xs text-white/40">{user?.two_factor_enabled ? 'Включена' : 'Выключена'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleToggle2FA}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${user?.two_factor_enabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                  >
                    <motion.div 
                      className="w-4 h-4 bg-white rounded-full shadow-md"
                      animate={{ x: user?.two_factor_enabled ? 24 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                <button onClick={logout} className="w-full flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 transition-colors text-red-400 group/logout">
                  <div className="flex items-center gap-3">
                    <LogOut size={18} />
                    <span className="text-sm font-bold">Выйти из аккаунта</span>
                  </div>
                  <ArrowUpRight size={16} className="opacity-50 group-hover/logout:opacity-100 transition-opacity" />
                </button>
              </div>
            </motion.div>
            
          </div>

          {/* Usage Stats Bento Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Plan Info */}
            <motion.div variants={itemVariants} className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/5 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden">
               <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-[40px] pointer-events-none" />
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                     <Activity size={14} /> Подписка
                   </h3>
                   <div className="flex items-center gap-2 mt-3">
                     <span className="px-3 py-1 bg-white text-black text-xs font-black uppercase tracking-wider rounded-lg">
                       {currentPlan.name}
                     </span>
                     <span className="text-xs text-white/40 font-medium">Model: {currentPlan.model}</span>
                   </div>
                 </div>
                 <button onClick={() => navigate('/pricing')} className="h-10 px-5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/5 backdrop-blur-md shadow-xl hover:-translate-y-0.5">
                   Улучшить
                 </button>
               </div>

               <div className="mt-auto space-y-5">
                 {/* Queries */}
                 <div>
                   <div className="flex justify-between text-xs mb-2">
                     <span className="text-white/60 font-medium">Запросы ИИ</span>
                     <span className="font-bold">{currentReq} / {currentPlan.maxReq === 999 ? '∞' : currentPlan.maxReq}</span>
                   </div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                     <motion.div 
                       className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                       initial={{ width: 0 }} animate={{ width: `${reqPercent}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                     />
                   </div>
                 </div>
                 
                 {/* Audits */}
                 {currentPlan.maxDoc > 0 && (
                   <div>
                     <div className="flex justify-between text-xs mb-2">
                       <span className="text-white/60 font-medium">Аудит контрактов</span>
                       <span className="font-bold">{currentDoc} / {currentPlan.maxDoc}</span>
                     </div>
                     <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                         initial={{ width: 0 }} animate={{ width: `${docPercent}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                       />
                     </div>
                   </div>
                 )}
               </div>
            </motion.div>

            {/* API Keys */}
            <motion.div variants={itemVariants} className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden group lg:col-span-2">
              <div>
                <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <KeyRound size={14} /> Интеграция по API
                </h3>
                <p className="text-sm text-white/50 mb-6">Используйте наш API для автоматизации проверки контрагентов и интеграции ИИ-юриста прямо в вашу CRM (Bitrix24, AmoCRM).</p>
              </div>

              <div className="mt-auto flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex items-center justify-between bg-[#050505] border border-white/10 rounded-2xl p-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Секретный ключ</span>
                    <span className="font-mono text-sm text-white/80">{user?.api_key || 'sk-live-*************************'}</span>
                  </div>
                  <button onClick={handleCopyApi} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-white/60" />}
                  </button>
                </div>
                <button onClick={handleGenerateKey} className="sm:w-auto h-full min-h-[4rem] px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 hover:border-white/20">
                  <Zap size={16} className="text-emerald-400"/>
                  <span>Сгенерировать</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Bottom Row: Invoices & Language */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Mock Billing History */}
            <motion.div variants={itemVariants} className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8">
               <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  <CreditCard size={14} /> История платежей
               </h3>
               <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-colors cursor-pointer group">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50 group-hover:text-white transition-colors">
                       <Clock size={18} />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-white">Оплата тарифа «{currentPlan.name}»</p>
                       <p className="text-xs text-white/40">12 Июня 2026</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-bold text-emerald-400">-{currentPlan.monthlyPrice || '0'} ₸</p>
                     <p className="text-xs text-white/40 flex items-center gap-1 justify-end">Успешно</p>
                   </div>
                 </div>
                 
                 <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-colors cursor-pointer group">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50 group-hover:text-white transition-colors">
                       <Clock size={18} />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-white">Оплата тарифа «FREEMIUM»</p>
                       <p className="text-xs text-white/40">12 Мая 2026</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-bold text-white">0 ₸</p>
                     <p className="text-xs text-white/40 flex items-center gap-1 justify-end">Успешно</p>
                   </div>
                 </div>
               </div>
            </motion.div>

            {/* Language Selection */}
            <motion.div variants={itemVariants} className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col">
              <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Globe size={14} /> Локализация
              </h3>
              
              <div className="flex-1 flex flex-col justify-center gap-4">
                <button
                  onClick={() => switchLanguage('ru')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    lang === 'ru' 
                    ? 'bg-white/10 border-white/20' 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🇷🇺</span>
                    <span className="font-bold text-sm">Русский язык</span>
                  </div>
                  {lang === 'ru' && <Check size={18} className="text-emerald-400" />}
                </button>

                <button
                  onClick={() => switchLanguage('kz')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    lang === 'kz' 
                    ? 'bg-white/10 border-white/20' 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🇰🇿</span>
                    <span className="font-bold text-sm">Қазақ тілі</span>
                  </div>
                  {lang === 'kz' && <Check size={18} className="text-emerald-400" />}
                </button>
              </div>
            </motion.div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
