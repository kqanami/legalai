import { useState, useEffect, memo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Trophy, MapPin, Clock, ArrowLeft, MessageSquare,
  Award, TrendingUp, Send, CheckCircle2, Shield, Briefcase
} from 'lucide-react';
import { marketplaceApi, escalationApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

/* ─────────────────────────────────────────────
   MICRO COMPONENTS
───────────────────────────────────────────── */

const TopRatedBadge = memo(() => (
  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black">
    <Trophy size={12} strokeWidth={2.5} />
    <span className="text-[10px] font-bold uppercase tracking-widest">Топ юрист</span>
  </div>
));

const VerifiedBadge = memo(() => (
  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-white">
    <CheckCircle2 size={12} strokeWidth={2.5} />
    <span className="text-[10px] font-bold uppercase tracking-widest">Проверен</span>
  </div>
));

const ReviewCard = memo(({ review, index }) => (
  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
    className="rounded-3xl bg-white/[0.02] border border-white/5 p-8 flex flex-col justify-between hover:bg-white/[0.04] transition-colors group">
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
          <Star size={12} className="text-white" fill="currentColor" />
          <span className="text-xs font-bold text-white">{review.rating.toFixed(1)}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
          {new Date(review.created_at).toLocaleDateString('ru')}
        </span>
      </div>
      <p className="text-sm text-neutral-300 leading-relaxed font-medium mb-6">"{review.comment}"</p>
    </div>
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-neutral-500">
        {review.client_name ? review.client_name.charAt(0).toUpperCase() : 'К'}
      </div>
      <span className="text-xs font-bold text-white/50">{review.client_name || 'Клиент'}</span>
    </div>
  </motion.div>
));

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function LawyerPublicProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([
      marketplaceApi.getPublicProfile(id).then(setProfile).catch(() => {}),
      marketplaceApi.getReviews(id).then(setReviews).catch(() => {})
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleContact = async () => {
    if (!contactMsg.trim()) return;
    setSending(true);
    try {
      await escalationApi.createRequest({
        lawyer_id: parseInt(id),
        category: profile.specialization,
        city: profile.city,
        description: contactMsg,
      });
      setShowContact(false);
      setContactMsg('');
      addToast('Заявка отправлена! Юрист получит уведомление.', 'success');
    } catch {
      addToast('Ошибка при отправке заявки.', 'error');
    } finally { setSending(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
        <Shield size={20} className="text-white/40" />
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
      <Shield size={48} className="text-white/10" />
      <p className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">Досье не найдено</p>
      <Link to="/lawyers" className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors text-[10px] uppercase tracking-widest">
        В каталог
      </Link>
    </div>
  );

  const initials = profile.name ? profile.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 flex flex-col lg:flex-row">
      
      {/* ── Left Pane: Sticky Dossier Identity ── */}
      <div className="lg:w-[35%] xl:w-[30%] border-b lg:border-b-0 lg:border-r border-white/5 bg-[#050505] z-20">
        <div className="lg:sticky lg:top-0 lg:h-screen flex flex-col">
          {/* Navigation & Status */}
          <div className="p-8 pb-4 flex items-center justify-between">
            <Link to="/lawyers" className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Online</span>
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 flex flex-col justify-center px-8 py-10 lg:py-0">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <motion.div layoutId={`lawyer-avatar-${profile.id}`} className="w-32 h-32 lg:w-40 lg:h-40 rounded-[2.5rem] bg-white/[0.02] border border-white/10 flex items-center justify-center text-4xl lg:text-5xl font-bold text-white mb-8 shadow-2xl">
                {initials}
              </motion.div>
              <div className="flex flex-wrap gap-2 mb-6">
                {profile.is_top_rated && <TopRatedBadge />}
                {profile.verified && <VerifiedBadge />}
              </div>
              <motion.h1 layoutId={`lawyer-name-${profile.id}`} className="text-3xl lg:text-5xl font-black tracking-tight leading-none mb-4">{profile.name}</motion.h1>
              <p className="text-base lg:text-lg text-neutral-400 font-medium mb-8 leading-relaxed">
                {profile.specialization}
              </p>
              <div className="flex flex-col gap-4 text-xs font-bold uppercase tracking-widest text-neutral-500">
                {profile.city && (
                  <div className="flex items-center gap-3">
                    <MapPin size={14} className="text-white/40" /> {profile.city}
                  </div>
                )}
                {profile.experience_years > 0 && (
                  <div className="flex items-center gap-3">
                    <Briefcase size={14} className="text-white/40" /> Стаж {profile.experience_years} лет
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sticky Action CTA */}
          <div className="p-8 border-t border-white/5 bg-[#050505]">
            <button 
              onClick={() => setShowContact(true)}
              className="w-full h-14 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-neutral-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95"
            >
              <MessageSquare size={16} /> Связаться
            </button>
          </div>
        </div>
      </div>

      {/* ── Right Pane: Scrollable Content ── */}
      <div className="lg:w-[65%] xl:w-[70%] bg-[#050505] min-h-screen relative">
        <div className="max-w-4xl mx-auto p-6 sm:p-8 lg:p-16 xl:p-24 space-y-16 lg:space-y-24">
          
          {/* Bio Section */}
          <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-8 flex items-center gap-3">
              <span className="w-8 h-px bg-neutral-800" /> Профиль специалиста
            </h2>
            <p className="text-2xl sm:text-3xl text-neutral-300 font-medium leading-[1.4] tracking-tight">
              {profile.description || "Квалифицированный юрист, специализирующийся на решении сложных правовых вопросов. Готов предоставить профессиональную помощь и защитить ваши интересы."}
            </p>
          </motion.section>

          {/* Huge Typography Stats */}
          <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-10 flex items-center gap-3">
              <span className="w-8 h-px bg-neutral-800" /> Показатели
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12 sm:gap-y-16">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl sm:text-8xl font-black tracking-tighter text-white">{profile.rating.toFixed(1)}</span>
                  <Star size={24} className="text-neutral-500 fill-neutral-500" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Рейтинг доверия</div>
              </div>
              
              <div>
                <div className="text-5xl sm:text-8xl font-black tracking-tighter text-white mb-2">{profile.cases_won}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Успешных дел</div>
              </div>

              <div>
                <div className="text-6xl sm:text-8xl font-black tracking-tighter text-white mb-2">{profile.win_rate}%</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Процент побед</div>
              </div>

              <div>
                <div className="text-6xl sm:text-8xl font-black tracking-tighter text-white mb-2">{profile.cases_total}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Всего дел</div>
              </div>
            </div>
          </motion.section>

          {/* Reviews Section */}
          <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-3">
                <span className="w-8 h-px bg-neutral-800" /> Отзывы клиентов
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 border border-white/10 px-3 py-1 rounded-full">
                {reviews.length} отзывов
              </span>
            </div>
            
            {reviews.length === 0 ? (
              <div className="rounded-[2rem] bg-white/[0.02] border border-white/5 p-16 text-center flex flex-col items-center justify-center">
                <MessageSquare size={32} className="text-neutral-700 mb-6" />
                <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest">Отзывов пока нет</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((r, i) => <ReviewCard key={r.id} review={r} index={i} />)}
              </div>
            )}
          </motion.section>

        </div>
      </div>

      {/* ── Contact Modal ── */}
      <AnimatePresence>
        {showContact && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/80 backdrop-blur-xl p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="rounded-[2.5rem] bg-[#0a0a0a] border border-white/10 w-full max-w-xl overflow-hidden shadow-2xl relative">
              
              <div className="p-8 sm:p-12">
                <h3 className="text-3xl font-black tracking-tight text-white mb-3">Связаться с юристом</h3>
                <p className="text-sm font-medium text-neutral-400 leading-relaxed mb-8">
                  Опишите суть вашей проблемы. {profile.name} получит уведомление и свяжется с вами для консультации.
                </p>
                
                <textarea
                  value={contactMsg}
                  onChange={e => setContactMsg(e.target.value)}
                  placeholder="Здравствуйте, мне нужна помощь с..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 text-sm text-white focus:outline-none focus:border-white/30 transition-colors h-40 resize-none mb-10 custom-scrollbar placeholder-neutral-600"
                />

                <div className="flex gap-4 justify-end">
                  <button onClick={() => setShowContact(false)}
                    className="px-6 h-12 rounded-2xl bg-white/[0.03] text-neutral-400 text-xs font-bold uppercase tracking-widest hover:bg-white/[0.08] hover:text-white transition-colors border border-white/5">
                    Отмена
                  </button>
                  <button onClick={handleContact} disabled={sending || !contactMsg.trim()}
                    className="px-8 h-12 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-200 disabled:bg-white/10 disabled:text-neutral-500 transition-colors">
                    {sending ? <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full" /> : <Send size={16} />}
                    {sending ? 'Отправка' : 'Отправить'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
