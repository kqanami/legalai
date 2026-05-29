import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { lawyerApi } from '../services/api';
import { useToast } from '../components/Toast';
import { User, Camera, Save, Star, LogOut, Globe, Eye, Settings, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export default function LawyerProfile() {
  const { user, refreshUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '',
    city: '',
    specialization: '',
    experience_years: 0,
    description: '',
    photo_url: '',
    is_accepting_clients: true
  });

  const cities = ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Тараз', 'Павлодар', 'Атырау'];
  const specs = ['Гражданское право', 'Уголовное право', 'Семейное право', 'Бизнес и налоги', 'Недвижимость', 'Корпоративное право', 'Трудовое право'];

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        city: user.city || 'Алматы',
        specialization: user.lawyer_profile?.specialization || 'Гражданское право',
        experience_years: user.lawyer_profile?.experience_years || 5,
        description: user.lawyer_profile?.description || '',
        photo_url: user.lawyer_profile?.photo_url || '',
        is_accepting_clients: user.lawyer_profile?.is_accepting_clients ?? true
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await lawyerApi.updateProfile(profile);
      await refreshUser();
      addToast('Профиль успешно обновлен', 'success');
    } catch (e) {
      console.error(e);
      addToast('Ошибка при сохранении', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-8 min-h-full bg-transparent overflow-y-auto custom-scrollbar relative selection:bg-chrome-500/30 selection:text-white"
    >
      <div className="max-w-6xl mx-auto space-y-10 pb-20 relative z-10">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2 uppercase">
              Настройки <span className="text-chrome-500">Профиля</span>
            </h1>
            <p className="text-neutral-500 font-bold tracking-widest text-[10px] uppercase">Управление публичной страницей юриста в маркетплейсе.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleLogout}
              className="px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-black text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all flex items-center gap-2"
            >
              <LogOut size={14} /> Выйти
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="bg-white text-black hover:bg-neutral-200 px-8 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50"
            >
              {loading ? <div className="w-3 h-3 border-2 border-black/20 border-t-black animate-spin rounded-full" /> : <Save size={14} />}
              <span>Сохранить</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ── Left Column: Preview & Status ── */}
          <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
            
            {/* Live Preview Card */}
            <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-chrome-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-chrome-500/10 transition-colors" />
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Предпросмотр</span>
                <Eye size={14} className="text-chrome-500" />
              </div>

              <div className="relative flex flex-col items-center text-center mt-2 z-10">
                <div className="relative group/photo cursor-pointer mb-5">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-xl relative flex items-center justify-center">
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-neutral-500" />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="text-white" size={20} />
                    </div>
                  </div>
                  {profile.is_accepting_clients && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-black border border-emerald-500/30 flex items-center justify-center shadow-lg">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1 tracking-tight">{profile.name || 'Ваше Имя'}</h3>
                <p className="text-[10px] text-chrome-500 font-bold uppercase tracking-widest mb-4">{profile.specialization}</p>
                
                <div className="flex justify-center w-full">
                  <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white bg-black/50 border border-white/5 rounded-xl py-2 px-4">
                    <div className="flex items-center gap-1"><Star size={12} className="text-amber-500" /> {user?.lawyer_profile?.rating?.toFixed(1) || '5.0'}</div>
                    <div className="w-px h-3 bg-white/10" />
                    <div className="text-chrome-500">{user?.lawyer_profile?.cases_won || 0} побед</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 mb-2">
                    <Globe size={14} className={profile.is_accepting_clients ? "text-chrome-500" : "text-neutral-600"} />
                    Статус в поиске
                  </h4>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-relaxed pr-4">
                    {profile.is_accepting_clients 
                      ? 'Анкета видна клиентам.' 
                      : 'Анкета скрыта.'}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setProfile({...profile, is_accepting_clients: !profile.is_accepting_clients})}
                  className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-300 ${profile.is_accepting_clients ? 'bg-white' : 'bg-black border border-white/10'}`}
                >
                  <motion.div 
                    layout
                    className={`w-4 h-4 rounded-full absolute top-1 shadow-md ${profile.is_accepting_clients ? 'bg-black' : 'bg-white/50'}`}
                    initial={false}
                    animate={{ left: profile.is_accepting_clients ? '28px' : '4px' }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </button>
              </div>
            </div>
            
          </motion.div>

          {/* ── Right Column: Edit Form ── */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            
            {/* Section 1: Basic Info */}
            <div className="bg-[#111] p-8 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <Settings size={14} className="text-chrome-500" /> Основные данные
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-black text-neutral-500 mb-2 uppercase tracking-widest">ФИО</label>
                  <input 
                    type="text" 
                    value={profile.name}
                    onChange={e => setProfile({...profile, name: e.target.value})}
                    className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3.5 text-xs font-bold text-white focus:outline-none focus:border-chrome-500/50 transition-colors"
                    placeholder="Иванов Иван Иванович"
                  />
                </div>
                
                <div>
                  <label className="block text-[9px] font-black text-neutral-500 mb-2 uppercase tracking-widest">Город</label>
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-xl">
                    <CustomSelect 
                      value={profile.city}
                      onChange={val => setProfile({...profile, city: val})}
                      options={cities.map(c => ({ value: c, label: c }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[9px] font-black text-neutral-500 mb-2 uppercase tracking-widest">Опыт (лет)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      max="50"
                      value={profile.experience_years}
                      onChange={e => setProfile({...profile, experience_years: parseInt(e.target.value) || 0})}
                      className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl pl-4 pr-12 py-3.5 text-xs font-bold text-white focus:outline-none focus:border-chrome-500/50 transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 text-[10px] uppercase font-black pointer-events-none">лет</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Specialization & Bio */}
            <div className="bg-[#111] p-8 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <Briefcase size={14} className="text-chrome-500" /> Профессиональный профиль
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[9px] font-black text-neutral-500 mb-2 uppercase tracking-widest">Основная специализация</label>
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-xl">
                    <CustomSelect 
                      value={profile.specialization}
                      onChange={val => setProfile({...profile, specialization: val})}
                      options={specs.map(s => ({ value: s, label: s }))}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[9px] font-black text-neutral-500 uppercase tracking-widest">О себе</label>
                    <span className="text-[9px] text-neutral-600 font-bold tracking-widest">{profile.description.length} / 500</span>
                  </div>
                  <textarea 
                    value={profile.description}
                    onChange={e => setProfile({...profile, description: e.target.value.slice(0, 500)})}
                    className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-4 text-xs font-bold text-white focus:outline-none focus:border-chrome-500/50 transition-colors h-40 resize-none leading-relaxed custom-scrollbar"
                    placeholder="Расскажите о своем опыте, ключевых победах и подходе к работе. Эта информация будет отображаться в вашей карточке на маркетплейсе..."
                  />
                  <div className="mt-3 flex items-start gap-2 p-4 rounded-xl bg-white/5 border border-white/5">
                    <Eye size={12} className="text-chrome-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 leading-relaxed">
                      Подробное описание профиля увеличивает конверсию в обращение на 40%. Укажите конкретные примеры успешных дел.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
