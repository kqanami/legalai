import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { lawyerApi } from '../services/api';
import { useToast } from '../components/Toast';
import { User, MapPin, Briefcase, Camera, Save, Star, ShieldCheck, Languages, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MagneticButton from '../components/MagneticButton';
import CustomSelect from '../components/CustomSelect';

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
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-6 mb-12">
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-obsidian-800 shadow-2xl relative">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-obsidian-800 flex items-center justify-center text-steel-500">
                  <User size={48} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera className="text-white" size={24} />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl chrome-gradient flex items-center justify-center text-obsidian-950 shadow-xl">
              <ShieldCheck size={20} />
            </div>
          </div>
          
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">{profile.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-yellow-500 font-bold">
                <Star size={16} fill="currentColor" /> {user?.lawyer_profile?.rating?.toFixed(1) || '5.0'}
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-steel-700" />
              <div className="text-steel-400 font-medium">{profile.specialization}</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <User size={20} className="text-chrome-400" /> Основная информация
            </h2>
            
            <div>
              <label className="block text-sm font-bold text-steel-400 mb-2 uppercase tracking-widest">Город</label>
              <CustomSelect 
                value={profile.city}
                onChange={val => setProfile({...profile, city: val})}
                options={['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Павлодар', 'Усть-Каменогорск']}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-steel-400 mb-2 uppercase tracking-widest">Специализация</label>
              <CustomSelect 
                value={profile.specialization}
                onChange={val => setProfile({...profile, specialization: val})}
                options={['Гражданское право', 'Уголовное право', 'Семейное право', 'Корпоративное право', 'Трудовое право']}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-bold text-steel-400 mb-2 uppercase tracking-widest">Стаж (лет)</label>
                <input 
                  type="number" 
                  value={profile.experience_years}
                  onChange={e => setProfile({...profile, experience_years: parseInt(e.target.value)})}
                  className="input-field shadow-inner"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase size={20} className="text-chrome-400" /> Описание практики
            </h2>

            <div>
              <label className="block text-sm font-bold text-steel-400 mb-2 uppercase tracking-widest">О себе</label>
              <textarea 
                value={profile.description}
                onChange={e => setProfile({...profile, description: e.target.value})}
                className="input-field shadow-inner h-40 resize-none leading-relaxed"
                placeholder="Расскажите о своем опыте и ключевых компетенциях..."
              />
            </div>

            <div className="p-6 glass-card border-obsidian-700/50 bg-obsidian-900/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-white tracking-wide uppercase">Статус приема</span>
                <button 
                  type="button"
                  onClick={() => setProfile({...profile, is_accepting_clients: !profile.is_accepting_clients})}
                  className={`w-12 h-6 rounded-full transition-all relative ${profile.is_accepting_clients ? 'bg-chrome-500' : 'bg-obsidian-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile.is_accepting_clients ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <p className="text-xs text-steel-500">
                {profile.is_accepting_clients 
                  ? 'Вы отображаетесь в маркетплейсе и можете получать новые заявки.' 
                  : 'Ваш профиль временно скрыт из поиска новых клиентов.'}
              </p>
            </div>
          </div>

          <div className="md:col-span-2 flex justify-between items-center mt-8 border-t border-obsidian-800 pt-8">
            <button 
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 font-bold px-6 py-3 rounded-xl hover:bg-red-500/10 transition-all"
            >
              <LogOut size={20} />
              <span>Выйти из аккаунта</span>
            </button>

            <MagneticButton 
              type="submit" 
              disabled={loading}
              className="btn-primary px-10 py-4 flex items-center gap-3 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
              {loading ? <div className="w-5 h-5 border-2 border-obsidian-950 border-t-transparent animate-spin rounded-full" /> : <Save size={20} />}
              <span className="text-lg">Сохранить изменения</span>
            </MagneticButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
