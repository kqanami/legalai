import { useState, useEffect, memo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, Shield, MapPin, Clock, ArrowLeft, MessageSquare, Award, TrendingUp, Send, CheckCircle2 } from 'lucide-react';
import { marketplaceApi, escalationApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

/* ── Background Effects ── */
const BackgroundEffects = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-chrome-500/5 blur-[120px]" />
    <div className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-amber-500/5 blur-[120px]" />
  </div>
));

/* ── Win Rate Arc ── */
const WinRateArc = memo(({ rate }) => {
  const size = 120;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 80 ? '#10B981' : rate >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Glow */}
      <div className="absolute inset-0 rounded-full opacity-20 blur-xl" style={{ backgroundColor: color }} />
      
      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <span className="text-2xl font-black text-white leading-none tracking-tight">{rate}%</span>
        <span className="text-[9px] text-steel-500 uppercase tracking-wider font-bold mt-1">Win Rate</span>
      </div>
    </div>
  );
});

/* ── Badges ── */
const TopRatedBadge = () => (
  <motion.div
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
    style={{
      background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(234,179,8,0.05) 100%)',
      border: '1px solid rgba(245,158,11,0.3)',
      color: '#F59E0B',
      boxShadow: '0 0 15px rgba(245,158,11,0.15)',
    }}
    animate={{ boxShadow: ['0 0 15px rgba(245,158,11,0.15)', '0 0 25px rgba(245,158,11,0.3)', '0 0 15px rgba(245,158,11,0.15)'] }}
    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
  >
    <Trophy size={10} className="text-amber-400" /> ТОП ЮРИСТ
  </motion.div>
);

const VerifiedBadge = () => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
    <CheckCircle2 size={10} /> PRO
  </span>
);

/* ── Rating Stars ── */
const RatingStars = memo(({ rating, size = 14 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={size} className={i <= Math.round(rating) ? 'text-amber-400' : 'text-obsidian-700'}
        fill={i <= Math.round(rating) ? 'currentColor' : 'none'} />
    ))}
  </div>
));

/* ── Review Card ── */
const ReviewCard = memo(({ review, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-obsidian-800 border border-white/[0.05] flex items-center justify-center text-sm font-bold text-steel-400">
          {review.reviewer_name ? review.reviewer_name.charAt(0) : '?'}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{review.reviewer_name || 'Анонимный клиент'}</p>
          <p className="text-[10px] text-steel-500 font-medium">{new Date(review.created_at).toLocaleDateString('ru-RU')}</p>
        </div>
      </div>
      <RatingStars rating={review.rating} size={12} />
    </div>
    {review.comment && (
      <p className="text-sm text-steel-300 leading-relaxed">{review.comment}</p>
    )}
  </motion.div>
));

export default function LawyerPublicProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadProfile();
    loadReviews();
  }, [id]);

  const loadProfile = async () => {
    try {
      const data = await marketplaceApi.getPublicProfile(id);
      setProfile(data);
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const data = await marketplaceApi.getReviews(id);
      setReviews(data);
    } catch (e) {
      console.error('Failed to load reviews:', e);
    }
  };

  const handleContact = async () => {
    if (!contactMessage.trim()) return;
    setSending(true);
    try {
      await escalationApi.createRequest({
        lawyer_id: parseInt(id),
        category: profile.specialization,
        city: profile.city,
        description: contactMessage,
      });
      setShowContactForm(false);
      setContactMessage('');
      addToast('Заявка отправлена! Юрист получит уведомление.', 'success');
    } catch (e) {
      console.error('Failed to send request:', e);
      addToast('Ошибка при отправке заявки.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-950 flex flex-col items-center justify-center relative">
        <BackgroundEffects />
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-chrome-500/20 to-chrome-500/5 border border-chrome-500/30 flex items-center justify-center animate-pulse relative z-10 shadow-[0_0_30px_rgba(14,165,233,0.2)]">
          <Shield size={24} className="text-chrome-400" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-obsidian-950 flex flex-col items-center justify-center gap-4 relative">
        <BackgroundEffects />
        <p className="text-steel-400 font-medium relative z-10">Анкета юриста не найдена</p>
        <Link to="/lawyers" className="btn-secondary text-sm px-5 py-2.5 relative z-10">Вернуться в каталог</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-950 relative selection:bg-chrome-500/30 selection:text-white pb-20">
      <BackgroundEffects />
      
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-40 border-b border-white/[0.04] bg-obsidian-950/70 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/lawyers" className="flex items-center gap-2 text-sm font-medium text-steel-400 hover:text-white transition-colors w-fit">
            <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
              <ArrowLeft size={16} />
            </div>
            Каталог юристов
          </Link>
          
          {user && (
            <button
              onClick={() => setShowContactForm(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-chrome-600 to-chrome-500 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(14,165,233,0.2)] hover:shadow-[0_0_25px_rgba(14,165,233,0.4)] transition-all active:scale-95"
            >
              <MessageSquare size={16} /> <span>Связаться</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 relative z-10">
        
        {/* ── Profile Header Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl p-[1px] bg-gradient-to-b from-white/[0.08] to-transparent mb-8 shadow-2xl"
        >
          <div className="rounded-3xl bg-obsidian-900/80 backdrop-blur-xl overflow-hidden relative">
            {/* Banner Background */}
            <div className="absolute top-0 inset-x-0 h-32 sm:h-40 bg-gradient-to-br from-chrome-500/20 via-obsidian-800 to-transparent border-b border-white/[0.04]" />
            
            <div className="p-6 sm:p-10 relative pt-20 sm:pt-24 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-10 text-center md:text-left">
              
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border border-white/[0.1] bg-obsidian-950 shadow-2xl relative flex items-center justify-center text-4xl sm:text-5xl font-black text-white">
                  {profile.name?.charAt(0) || '?'}
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-obsidian-950 border border-emerald-500/30 flex items-center justify-center shadow-lg">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pt-2">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{profile.name}</h1>
                  <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                    {profile.is_top_rated && <TopRatedBadge />}
                    {profile.verified && <VerifiedBadge />}
                  </div>
                </div>
                <p className="text-sm text-chrome-400 font-medium mb-4">{profile.specialization}</p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-6">
                  {profile.city && (
                    <span className="flex items-center gap-1.5"><MapPin size={14} className="text-steel-500" /> {profile.city}</span>
                  )}
                  {profile.experience_years > 0 && (
                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-steel-500" /> Стаж: {profile.experience_years} лет</span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Star size={14} className="text-amber-400" fill="currentColor" /> {profile.rating.toFixed(1)} ({profile.review_count} отзывов)
                  </span>
                </div>

                {profile.description && (
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-sm text-steel-300 leading-relaxed font-medium">
                      {profile.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Win Rate on Desktop */}
              <div className="hidden md:flex flex-shrink-0 pt-2">
                <WinRateArc rate={profile.win_rate} />
              </div>
              
            </div>
            
            {/* Win Rate on Mobile */}
            <div className="md:hidden flex justify-center pb-8 border-t border-white/[0.04] pt-6 mx-6">
              <WinRateArc rate={profile.win_rate} />
            </div>
          </div>
        </motion.div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Рейтинг', value: profile.rating.toFixed(1), icon: <Star size={18} className="text-amber-400" fill="currentColor" /> },
            { label: 'Побед', value: profile.cases_won, icon: <Trophy size={18} className="text-emerald-400" /> },
            { label: 'Всего дел', value: profile.cases_total, icon: <Award size={18} className="text-chrome-400" /> },
            { label: 'Успешность', value: `${profile.win_rate}%`, icon: <TrendingUp size={18} className="text-blue-400" /> },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
              className="rounded-2xl p-5 bg-obsidian-900/60 border border-white/[0.04] backdrop-blur-sm flex flex-col items-center justify-center hover:bg-white/[0.02] hover:border-white/[0.08] transition-all group"
            >
              <div className="mb-3 p-3 rounded-xl bg-white/[0.03] group-hover:scale-110 transition-transform">{stat.icon}</div>
              <div className="text-xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-[10px] text-steel-500 uppercase tracking-wider font-bold">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Reviews Section ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-chrome-500/10 border border-chrome-500/20 flex items-center justify-center">
              <MessageSquare size={18} className="text-chrome-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Отзывы клиентов</h2>
              <p className="text-xs text-steel-400 font-medium">Всего отзывов: {reviews.length}</p>
            </div>
          </div>
          
          {reviews.length === 0 ? (
            <div className="rounded-2xl bg-obsidian-900/40 border border-white/[0.04] p-10 text-center flex flex-col items-center justify-center">
              <MessageSquare size={32} className="text-steel-600 mb-4" />
              <p className="text-steel-400 font-medium">Пока нет отзывов от клиентов.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review, i) => (
                <ReviewCard key={review.id} review={review} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Contact Modal ── */}
      <AnimatePresence>
        {showContactForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="rounded-3xl bg-obsidian-900 border border-white/[0.1] w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/[0.05]">
                <h3 className="text-xl font-black text-white">Связаться с юристом</h3>
                <p className="text-xs text-steel-400 mt-1">Опишите вашу проблему, и {profile.name} свяжется с вами.</p>
              </div>
              
              <div className="p-6 bg-obsidian-950/50">
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Например: Добрый день! Мне нужна консультация по вопросу увольнения..."
                  className="w-full bg-obsidian-900 border border-white/[0.08] rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-chrome-500/50 transition-colors h-32 resize-none custom-scrollbar mb-6"
                />

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowContactForm(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/[0.03] text-steel-300 text-sm font-bold hover:bg-white/[0.08] hover:text-white transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleContact}
                    disabled={sending || !contactMessage.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-chrome-600 to-chrome-500 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(14,165,233,0.2)] disabled:opacity-50 disabled:shadow-none hover:shadow-[0_0_25px_rgba(14,165,233,0.4)] transition-all"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                    ) : (
                      <Send size={16} />
                    )}
                    {sending ? 'Отправка...' : 'Отправить'}
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
