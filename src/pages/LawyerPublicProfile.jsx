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

const BackgroundEffects = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-white/[0.015] blur-[120px]" />
    <div className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-white/[0.01] blur-[120px]" />
  </div>
));

const WinRateRing = memo(({ rate = 0 }) => {
  const size = 110;
  const radius = (size - 8) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (rate / 100) * circ;
  const color = rate >= 75 ? '#34d399' : rate >= 50 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full opacity-10 blur-xl" style={{ backgroundColor: color }} />
      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <span className="text-3xl font-black text-white leading-none tracking-tight">{rate}%</span>
        <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold mt-1">win rate</span>
      </div>
    </div>
  );
});

const TopRatedBadge = () => (
  <motion.div
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
    style={{
      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#FBBF24',
    }}
    animate={{ boxShadow: ['0 0 10px rgba(245,158,11,0)', '0 0 15px rgba(245,158,11,0.2)', '0 0 10px rgba(245,158,11,0)'] }}
    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
  >
    <Trophy size={10} className="text-amber-400" /> ТОП
  </motion.div>
);

const VerifiedBadge = () => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
    <CheckCircle2 size={10} /> PRO
  </span>
);

const RatingStars = memo(({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={14} className={i <= Math.round(rating) ? 'text-amber-400' : 'text-white/10'}
        fill={i <= Math.round(rating) ? 'currentColor' : 'none'} />
    ))}
  </div>
));

const ReviewCard = memo(({ review, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
    className="p-6 rounded-[2rem] glass-card transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/5"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-white/50">
          {review.reviewer_name ? review.reviewer_name.charAt(0) : '?'}
        </div>
        <div>
          <p className="text-sm font-bold text-white/90">{review.reviewer_name || 'Анонимный клиент'}</p>
          <p className="text-[11px] text-white/30 font-medium">{new Date(review.created_at).toLocaleDateString('ru-RU')}</p>
        </div>
      </div>
      <RatingStars rating={review.rating} />
    </div>
    {review.comment && (
      <p className="text-[13px] text-white/50 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/[0.03]">
        {review.comment}
      </p>
    )}
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative">
      <BackgroundEffects />
      <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center animate-pulse">
        <Shield size={20} className="text-white/40" />
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 relative">
      <BackgroundEffects />
      <p className="text-white/40 font-medium">Анкета не найдена</p>
      <Link to="/lawyers" className="px-5 py-2.5 rounded-xl bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white transition-colors text-sm">В каталог</Link>
    </div>
  );

  const initials = profile.name ? profile.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-transparent relative selection:bg-white/20 selection:text-white pb-20">
      <BackgroundEffects />

      {/* ── Topbar ── */}
      <div className="sticky top-0 z-40 border-b border-white/[0.05] bg-black/80 backdrop-blur-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/lawyers" className="flex items-center gap-2 text-[13px] font-semibold text-white/40 hover:text-white transition-colors">
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <ArrowLeft size={14} />
            </div>
            К списку юристов
          </Link>
          {user && (
            <button onClick={() => setShowContact(true)}
              className="px-5 py-2 rounded-xl bg-white text-black text-[13px] font-bold flex items-center gap-2 hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95">
              <MessageSquare size={14} /> Связаться
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 relative z-10">

        {/* ── Hero Profile Card ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[2.5rem] glass-premium mb-8 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

          <div className="p-6 sm:p-10 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 relative z-10">
            
            {/* Avatar & Ring */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] shadow-2xl flex items-center justify-center text-4xl font-black text-white">
                  {initials}
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[#0a0a0a] border border-emerald-500/30 flex items-center justify-center shadow-lg">
                  <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                </div>
              </div>
              
              <div className="hidden md:block">
                <WinRateRing rate={profile.win_rate} />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left min-w-0 pt-2">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{profile.name}</h1>
                <div className="flex justify-center gap-2">
                  {profile.is_top_rated && <TopRatedBadge />}
                  {profile.verified && <VerifiedBadge />}
                </div>
              </div>
              <p className="text-sm text-white/50 font-medium mb-6">{profile.specialization}</p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 text-[12px] text-white/40 mb-8">
                {profile.city && (
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-white/20" /> {profile.city}</span>
                )}
                {profile.experience_years > 0 && (
                  <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-white/20" /> Стаж: {profile.experience_years} лет</span>
                )}
                <span className="flex items-center gap-1.5">
                  <Star size={14} className="text-amber-400" fill="currentColor" />
                  <span className="text-white/80 font-bold">{profile.rating.toFixed(1)}</span>
                  <span>({profile.review_count} отз.)</span>
                </span>
              </div>

              {profile.description && (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[14px] text-white/50 leading-relaxed font-medium">
                    {profile.description}
                  </p>
                </div>
              )}
            </div>

            {/* Win rate for mobile */}
            <div className="md:hidden w-full flex justify-center pt-6 border-t border-white/[0.05]">
              <WinRateRing rate={profile.win_rate} />
            </div>
          </div>
        </motion.div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Рейтинг', value: profile.rating.toFixed(1), icon: <Star size={16} className="text-amber-400" fill="currentColor" /> },
            { label: 'Побед', value: profile.cases_won, icon: <Trophy size={16} className="text-emerald-400" /> },
            { label: 'Всего дел', value: profile.cases_total, icon: <Award size={16} className="text-white/60" /> },
            { label: 'Успешность', value: `${profile.win_rate}%`, icon: <TrendingUp size={16} className="text-blue-400" /> },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
              className="rounded-2xl p-5 bg-[#0a0a0a] border border-white/[0.06] flex flex-col items-center justify-center hover:bg-white/[0.02] hover:border-white/[0.1] transition-all group shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <div className="mb-3 p-3 rounded-xl bg-white/[0.04] group-hover:scale-110 transition-transform">{stat.icon}</div>
              <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider font-bold">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Reviews ── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <MessageSquare size={16} className="text-white/60" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Отзывы клиентов</h2>
              <p className="text-[11px] text-white/30 font-medium">Всего отзывов: {reviews.length}</p>
            </div>
          </div>
          
          {reviews.length === 0 ? (
            <div className="rounded-2xl bg-[#0a0a0a] border border-white/[0.06] p-12 text-center flex flex-col items-center justify-center shadow-lg">
              <MessageSquare size={28} className="text-white/10 mb-4" />
              <p className="text-[13px] text-white/30 font-medium">Пока нет отзывов от клиентов.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((r, i) => <ReviewCard key={r.id} review={r} index={i} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Contact Modal ── */}
      <AnimatePresence>
        {showContact && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="rounded-3xl bg-[#0a0a0a] border border-white/[0.08] w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
              
              <div className="p-6 sm:p-8">
                <h3 className="text-2xl font-black text-white mb-2">Написать юристу</h3>
                <p className="text-[13px] text-white/40 leading-relaxed mb-6">Опишите вашу проблему, и {profile.name} свяжется с вами.</p>
                
                <textarea
                  value={contactMsg}
                  onChange={e => setContactMsg(e.target.value)}
                  placeholder="Опишите вашу ситуацию..."
                  className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 text-[14px] text-white focus:outline-none focus:border-white/30 transition-colors h-32 resize-none mb-8"
                />

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowContact(false)}
                    className="px-5 h-10 rounded-xl bg-white/[0.04] text-white/50 text-[13px] font-bold hover:bg-white/[0.08] hover:text-white transition-all">
                    Отмена
                  </button>
                  <button onClick={handleContact} disabled={sending || !contactMsg.trim()}
                    className="px-6 h-10 rounded-xl bg-white text-black text-[13px] font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-white/90 disabled:opacity-50 transition-all">
                    {sending ? <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full" /> : <Send size={15} />}
                    {sending ? 'Отправка...' : 'Отправить запрос'}
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
