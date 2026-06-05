import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  ShieldCheck, KeyRound, Smartphone, Mail, Globe, LogOut, 
  Activity, Save, X, Edit3, CreditCard, Clock, Check
} from 'lucide-react';

const plans = {
  freemium: { name: 'FREEMIUM', limit: '3 премиум', maxReq: 12, maxDoc: 0, model: 'Sonnet 3.5' },
  go: { name: 'GO', monthlyPrice: '5,000', limit: '20 / день', maxReq: 20, maxDoc: 2, model: 'Haiku' },
  ip: { name: 'ИП', monthlyPrice: '19,990', limit: '15 / мес', maxReq: 100, maxDoc: 15, model: 'Sonnet' },
  business: { name: 'БИЗНЕС', monthlyPrice: '50,000', limit: 'Безлимит', maxReq: 999, maxDoc: 100, model: 'Opus' }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      staggerChildren: 0.1, 
      delayChildren: 0.05 
    } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95, filter: 'blur(10px)' },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    filter: 'blur(0px)', 
    transition: { 
      type: 'spring', 
      stiffness: 100, 
      damping: 15, 
      mass: 0.5 
    } 
  }
};

export default function ProfilePage() {
  const { user, logout, updateProfile, toggle2fa } = useAuth();
  const { lang, switchLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', city: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    <div className="flex flex-col h-full bg-[#020202] text-white overflow-hidden p-4 md:p-8 lg:p-10 font-sans selection:bg-emerald-500/30 relative">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2 pb-24 z-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto flex flex-col gap-6">
          
          {/* Main 3-column Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
            
            {/* User Profile Card (Spans 2 cols) */}
            <motion.div variants={itemVariants} className="md:col-span-2 relative bg-[#080808]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 overflow-hidden group hover:border-white/20 transition-all duration-500 shadow-2xl">
              {/* Animated Hover Glow inside card */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 relative z-10">
                <div className="flex items-center gap-6 w-full">
                  <motion.div whileHover={{ scale: 1.05 }} className="relative shrink-0 cursor-pointer">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-zinc-800 to-black border-2 border-white/10 text-white flex items-center justify-center text-4xl sm:text-5xl font-black shadow-inner overflow-hidden relative">
                      <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
                      <span className="relative z-10 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">{user?.name?.charAt(0) || 'U'}</span>
                    </div>
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-[#080808] rounded-full">
                      <motion.div className="w-full h-full bg-emerald-400 rounded-full" animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
                    </div>
                  </motion.div>
                  
                  <div className="flex-1 w-full">
                    <AnimatePresence mode="wait">
                      {isEditing ? (
                        <motion.div 
                          key="edit"
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                          className="space-y-3 w-full max-w-md"
                        >
                          <input 
                            type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                            className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3 text-lg font-bold focus:outline-none focus:border-emerald-500/50 focus:bg-white/5 transition-all"
                            placeholder="Имя"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input 
                              type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/5 transition-all"
                              placeholder="Телефон"
                            />
                            <input 
                              type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/5 transition-all"
                              placeholder="Email"
                            />
                          </div>
                          {errorMsg && <p className="text-red-400 text-xs px-2">{errorMsg}</p>}
                          <div className="flex gap-3 pt-2">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSaveProfile} disabled={isSaving} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-black text-sm py-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2">
                              {isSaving ? 'Сохранение...' : <><Save size={16}/> Сохранить</>}
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsEditing(false)} className="px-5 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-colors">
                              <X size={18}/>
                            </motion.button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div className="flex items-center gap-4 mb-3">
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">{user?.name}</h1>
                            <motion.button whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }} onClick={() => setIsEditing(true)} className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
                              <Edit3 size={16} />
                            </motion.button>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs font-semibold text-white/60">
                            <span className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-sm"><Smartphone size={14} className="text-white/40"/> {user?.phone || 'Нет телефона'}</span>
                            <span className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-sm"><Mail size={14} className="text-white/40"/> {user?.email || 'Нет email'}</span>
                            <span className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-sm"><Globe size={14} className="text-white/40"/> {user?.city || 'Казахстан'}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Security */}
            <motion.div variants={itemVariants} className="bg-[#080808]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden group shadow-xl">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" /> Безопасность
                </h3>
              </div>
              
              <div className="space-y-4 flex-1">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${user?.two_factor_enabled ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-white/40'}`}>
                        <KeyRound size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white/90">2FA Вход</p>
                        <p className="text-xs text-white/40">{user?.two_factor_enabled ? 'Включена' : 'Выключена'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleToggle2FA}
                      className={`relative w-12 h-6 rounded-full p-1 transition-colors duration-300 ${user?.two_factor_enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                    >
                      <motion.div 
                        className="w-4 h-4 bg-white rounded-full shadow-md"
                        animate={{ x: user?.two_factor_enabled ? 24 : 0 }}
                        transition={{ type: "spring", stiffness: 700, damping: 30 }}
                      />
                    </button>
                  </div>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={logout} className="w-full flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 transition-colors text-red-400 group/logout mt-auto">
                    <div className="flex items-center gap-3">
                      <LogOut size={18} />
                      <span className="text-sm font-bold">Выйти из аккаунта</span>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Usage Stats (Spans 1 col) */}
            <motion.div variants={itemVariants} className="bg-gradient-to-b from-[#0A0A0A] to-[#050505] border border-white/10 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden shadow-xl">
               <div className="absolute -right-20 -top-20 w-60 h-60 bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none" />
               <div className="flex justify-between items-start mb-8">
                 <div>
                   <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                     <Activity size={14} className="text-white" /> Подписка
                   </h3>
                   <div className="flex items-center gap-2 mt-3">
                     <span className="px-3 py-1.5 bg-white text-black text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-white/10">
                       {currentPlan.name}
                     </span>
                   </div>
                 </div>
                 <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/pricing')} className="h-10 px-5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 backdrop-blur-md flex items-center shadow-lg">
                   Улучшить
                 </motion.button>
               </div>

               <div className="mt-auto space-y-6">
                 <div>
                   <div className="flex justify-between text-xs mb-3">
                     <span className="text-white/60 font-semibold uppercase tracking-wider">Запросы ИИ</span>
                     <span className="font-black text-white/90">{currentReq} <span className="text-white/40">/ {currentPlan.maxReq === 999 ? '∞' : currentPlan.maxReq}</span></span>
                   </div>
                   <div className="h-2.5 w-full bg-black rounded-full overflow-hidden border border-white/5">
                     <motion.div 
                       className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 relative"
                       initial={{ width: 0 }} animate={{ width: `${reqPercent}%` }} transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                     >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:10px_10px] animate-slide-right opacity-50" />
                     </motion.div>
                   </div>
                 </div>
                 
                 {currentPlan.maxDoc > 0 && (
                   <div>
                     <div className="flex justify-between text-xs mb-3">
                       <span className="text-white/60 font-semibold uppercase tracking-wider">Аудит</span>
                       <span className="font-black text-white/90">{currentDoc} <span className="text-white/40">/ {currentPlan.maxDoc}</span></span>
                     </div>
                     <div className="h-2.5 w-full bg-black rounded-full overflow-hidden border border-white/5">
                       <motion.div 
                         className="h-full bg-gradient-to-r from-blue-500 to-blue-400 relative"
                         initial={{ width: 0 }} animate={{ width: `${docPercent}%` }} transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                       >
                         <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:10px_10px] animate-slide-right opacity-50" />
                       </motion.div>
                     </div>
                   </div>
                 )}
               </div>
            </motion.div>

            {/* Billing History (Spans 1 col) */}
            <motion.div variants={itemVariants} className="bg-[#080808]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
               <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  <CreditCard size={14} className="text-white" /> История платежей
               </h3>
               <div className="space-y-4">
                 <motion.div whileHover={{ scale: 1.02 }} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-white/10 transition-colors cursor-pointer group">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50 group-hover:bg-white/10 group-hover:text-white transition-all">
                       <Clock size={18} />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">Тариф «{currentPlan.name}»</p>
                       <p className="text-xs text-white/40">12 Июня 2026</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-black text-emerald-400">-{currentPlan.monthlyPrice || '0'} ₸</p>
                     <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">Успешно</p>
                   </div>
                 </motion.div>
                 
                 <motion.div whileHover={{ scale: 1.02 }} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-white/10 transition-colors cursor-pointer group">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50 group-hover:bg-white/10 group-hover:text-white transition-all">
                       <Clock size={18} />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">Тариф «FREEMIUM»</p>
                       <p className="text-xs text-white/40">12 Мая 2026</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-black text-white/80">0 ₸</p>
                     <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">Успешно</p>
                   </div>
                 </motion.div>
               </div>
            </motion.div>

            {/* Language Selection (Spans 1 col) */}
            <motion.div variants={itemVariants} className="bg-[#080808]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col shadow-xl group hover:border-white/20 transition-colors duration-500">
              <h3 className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Globe size={14} className="text-white" /> Локализация
              </h3>
              
              <div className="flex-1 flex flex-col justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => switchLanguage('ru')}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
                    lang === 'ru' 
                    ? 'bg-gradient-to-r from-white/10 to-white/5 border-white/20 shadow-lg shadow-white/5' 
                    : 'bg-black/40 border-white/5 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl drop-shadow-md">🇷🇺</span>
                    <span className="font-bold text-sm text-white/90">Русский язык</span>
                  </div>
                  <AnimatePresence>
                    {lang === 'ru' && (
                      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                        <Check size={20} className="text-emerald-400" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => switchLanguage('kz')}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
                    lang === 'kz' 
                    ? 'bg-gradient-to-r from-white/10 to-white/5 border-white/20 shadow-lg shadow-white/5' 
                    : 'bg-black/40 border-white/5 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl drop-shadow-md">🇰🇿</span>
                    <span className="font-bold text-sm text-white/90">Қазақ тілі</span>
                  </div>
                  <AnimatePresence>
                    {lang === 'kz' && (
                      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                        <Check size={20} className="text-emerald-400" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </motion.div>

          </div>
        </motion.div>
      </div>
      
      {/* Custom CSS for striped progress bar animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-right {
          from { background-position: 0 0; }
          to { background-position: 20px 0; }
        }
        .animate-slide-right {
          animation: slide-right 1s linear infinite;
        }
      `}} />
    </div>
  );
}
