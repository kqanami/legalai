import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Trophy, Shield, MapPin, Clock, ArrowLeft, MessageSquare, Award, TrendingUp, Send } from 'lucide-react';
import { marketplaceApi, escalationApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

/* ── Win Rate Arc ── */
function WinRateArc({ rate }) {
  const size = 120;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 80 ? '#10B981' : rate >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white">{rate}%</span>
        <span className="text-[9px] text-steel-500 uppercase tracking-wider font-bold">Win Rate</span>
      </div>
    </div>
  );
}

/* ── Rating Stars ── */
function RatingStars({ rating, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= Math.round(rating) ? 'text-amber-400' : 'text-obsidian-600'}
          fill={i <= Math.round(rating) ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

/* ── Review Card ── */
function ReviewCard({ review }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 border border-white/[0.06]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-obsidian-700 flex items-center justify-center text-xs font-bold text-chrome-300">
            {review.reviewer_name ? review.reviewer_name.charAt(0) : '?'}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{review.reviewer_name || 'Анонимный клиент'}</p>
            <p className="text-[10px] text-steel-500">{new Date(review.created_at).toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
        <RatingStars rating={review.rating} size={12} />
      </div>
      {review.comment && (
        <p className="text-sm text-steel-300 leading-relaxed">{review.comment}</p>
      )}
    </motion.div>
  );
}

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
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-950 flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl chrome-gradient animate-pulse" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-obsidian-950 flex flex-col items-center justify-center gap-4">
        <p className="text-steel-400">Юрист не найден</p>
        <Link to="/lawyers" className="btn-secondary text-sm px-4 py-2">← Назад к списку</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-950">
      {/* Top Bar */}
      <div className="border-b border-white/[0.04] bg-obsidian-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/lawyers" className="flex items-center gap-2 text-sm text-steel-400 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Каталог юристов
          </Link>
          {user && (
            <button
              onClick={() => setShowContactForm(true)}
              className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
            >
              <MessageSquare size={14} /> Связаться
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 border border-white/[0.06] mb-6"
        >
          <div className="flex flex-col md:flex-row items-start gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-3xl chrome-gradient flex items-center justify-center text-obsidian-950 font-extrabold text-4xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                {profile.name?.charAt(0) || '?'}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-extrabold text-white">{profile.name}</h1>
                {profile.is_top_rated && (
                  <motion.span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                    style={{
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(234,179,8,0.08) 100%)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      color: '#F59E0B',
                    }}
                    animate={{ boxShadow: ['0 0 12px rgba(245,158,11,0.1)', '0 0 24px rgba(245,158,11,0.2)', '0 0 12px rgba(245,158,11,0.1)'] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Trophy size={12} /> Top Rated
                  </motion.span>
                )}
                {profile.verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Shield size={10} /> Верифицирован
                  </span>
                )}
              </div>
              <p className="text-sm text-steel-400 mb-3">{profile.specialization}</p>

              <div className="flex items-center gap-4 flex-wrap text-xs text-steel-400">
                {profile.city && (
                  <span className="flex items-center gap-1"><MapPin size={12} /> {profile.city}</span>
                )}
                {profile.experience_years > 0 && (
                  <span className="flex items-center gap-1"><Clock size={12} /> Стаж: {profile.experience_years} лет</span>
                )}
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-amber-400" fill="currentColor" /> {profile.rating.toFixed(1)} ({profile.review_count} отзывов)
                </span>
              </div>

              {profile.bio && (
                <p className="mt-4 text-sm text-steel-300 leading-relaxed border-t border-white/[0.06] pt-4">{profile.bio}</p>
              )}
            </div>

            {/* Win Rate */}
            <div className="flex-shrink-0">
              <WinRateArc rate={profile.win_rate} />
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Рейтинг', value: profile.rating.toFixed(1), icon: <Star size={16} className="text-amber-400" fill="currentColor" /> },
            { label: 'Побед', value: profile.cases_won, icon: <Trophy size={16} className="text-emerald-400" /> },
            { label: 'Всего дел', value: profile.cases_total, icon: <Award size={16} className="text-chrome-400" /> },
            { label: 'Win Rate', value: `${profile.win_rate}%`, icon: <TrendingUp size={16} className="text-blue-400" /> },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="glass-card p-4 text-center border border-white/[0.06]"
            >
              <div className="flex items-center justify-center mb-2">{stat.icon}</div>
              <div className="text-xl font-extrabold text-white">{stat.value}</div>
              <div className="text-[10px] text-steel-500 uppercase tracking-wider font-bold">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Reviews Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-chrome-400" /> Отзывы клиентов
            <span className="text-xs text-steel-500 font-normal">({reviews.length})</span>
          </h2>
          {reviews.length === 0 ? (
            <div className="glass-card p-8 text-center border border-white/[0.06]">
              <p className="text-steel-400 text-sm">Пока нет отзывов</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review, i) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-card p-6 w-full max-w-lg border border-white/[0.1]"
          >
            <h3 className="text-lg font-bold text-white mb-1">Связаться с юристом</h3>
            <p className="text-xs text-steel-400 mb-4">Опишите вашу проблему — юрист получит уведомление</p>

            <textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Например: Меня незаконно уволили из компании. Нужна помощь с составлением иска в суд..."
              className="input-field min-h-[120px] resize-none mb-4"
              rows={5}
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowContactForm(false)}
                className="btn-secondary text-sm px-4 py-2"
              >
                Отмена
              </button>
              <button
                onClick={handleContact}
                disabled={sending || !contactMessage.trim()}
                className="btn-primary text-sm px-5 py-2 flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={14} /> {sending ? 'Отправка...' : 'Отправить заявку'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
