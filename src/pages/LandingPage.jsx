import { Link } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from '../components/LanguageToggle';
import KineticBackground from '../components/KineticBackground';
import MagneticButton from '../components/MagneticButton';
import { Scale, FileText, Globe, ArrowRight, Sparkles, Bot, Search, FileSearch, Building2 } from 'lucide-react';

/* ─── Animated Counter ─── */
function CountUp({ target, suffix = '', duration = 2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const num = parseInt(target.replace(/\D/g, '')) || 0;
    let start = 0;
    const step = Math.max(1, Math.floor(num / (duration * 60)));
    const id = setInterval(() => {
      start += step;
      if (start >= num) { setVal(num); clearInterval(id); }
      else setVal(start);
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [inView, target, duration]);
  return <span ref={ref}>{inView ? `${val.toLocaleString()}${suffix}` : '0'}</span>;
}

/* ─── 3D Tilt Card ─── */
function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { damping: 20 });
  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className={className}>{children}</motion.div>
  );
}

/* ─── Scroll Reveal ─── */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >{children}</motion.div>
  );
}

/* ─── Data ─── */
const stats = [
  { value: '15000', suffix: '+', label: 'Статей законодательства' },
  { value: '50', suffix: '+', label: 'Кодексов и законов РК' },
  { value: '5', suffix: ' сек', label: 'Среднее время ответа' },
  { value: '24', suffix: '/7', label: 'Доступность системы' },
];

const steps = [
  { icon: <Bot size={24} />, title: 'Задайте вопрос', desc: 'На русском или казахском языке — система понимает оба' },
  { icon: <Search size={24} />, title: 'AI ищет по НПА', desc: 'Поиск по 15,000+ статьям кодексов и законов РК' },
  { icon: <FileText size={24} />, title: 'Получите ответ', desc: 'С точными ссылками на статьи и источники' },
];

const capabilities = [
  { icon: <Scale size={28} strokeWidth={1.5} />, title: 'AI-консультации', desc: 'Мгновенные ответы по любым правовым вопросам с цитатами из кодексов РК' },
  { icon: <FileSearch size={28} strokeWidth={1.5} />, title: 'Аудит договоров', desc: 'Глубокая проверка документов на соответствие законодательству' },
  { icon: <FileText size={28} strokeWidth={1.5} />, title: 'Генерация документов', desc: 'Автоматическое создание исков, заявлений и договоров' },
  { icon: <Building2 size={28} strokeWidth={1.5} />, title: 'Проверка контрагентов', desc: 'Полный анализ юридических лиц по БИН через открытые базы' },
  { icon: <Globe size={28} strokeWidth={1.5} />, title: 'Двуязычность', desc: 'Полная поддержка казахского и русского языков' },
];

export default function LandingPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-obsidian-950 overflow-hidden">
      {/* ══════ BG ══════ */}
      <div className="fixed inset-0 z-0"><KineticBackground variant="landing" /></div>
      {/* noise */}
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px' }} />

      {/* ══════ HEADER ══════ */}
      <motion.header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-obsidian-950/60 border-b border-white/[0.04]"
        initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div className="w-10 h-10 rounded-xl chrome-gradient flex items-center justify-center shadow-lg"
              whileHover={{ rotate: [0, -5, 5, 0], scale: 1.05 }} transition={{ duration: 0.4 }}>
              <Scale className="text-obsidian-950" size={20} strokeWidth={2.5} />
            </motion.div>
            <span className="text-white font-bold text-lg tracking-wide">AI-<span className="metal-text">{t('landing_title_accent')}</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <MagneticButton as={Link} to={user ? '/dashboard' : '/auth'}
              className="btn-primary text-sm px-5 py-2 shadow-[0_0_20px_rgba(255,255,255,0.08)]">
              {user ? 'Dashboard' : t('auth_login')}
            </MagneticButton>
          </div>
        </div>
      </motion.header>

      {/* ══════ HERO ══════ */}
      <section className="relative z-10 pt-32 sm:pt-40 pb-20 sm:pb-28">
        <div className="max-w-6xl mx-auto px-6 text-center">

          {/* Badge */}
          <motion.div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md mb-8"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <motion.span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="text-xs text-chrome-300 font-medium tracking-wider uppercase">Система активна • AI Legal Engine v1.0</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 className="text-5xl sm:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight leading-[1.05] mb-6"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
            <span className="text-white">Правовой интеллект</span>
            <br />
            <span className="metal-text">нового поколения</span>
          </motion.h1>

          {/* Sub */}
          <motion.p className="text-lg sm:text-xl text-steel-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            {t('landing_subtitle')}
          </motion.p>

          {/* CTAs */}
          <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <MagneticButton as={Link} to={user ? '/dashboard' : '/auth'}
              className="btn-primary text-lg px-10 py-5 shadow-[0_0_40px_rgba(255,255,255,0.12)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] group" strength={0.3}>
              <span className="flex items-center gap-2">
                {user ? 'Перейти в дашборд' : t('landing_cta')}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </MagneticButton>
            <MagneticButton as="a" href="#capabilities"
              className="btn-secondary text-lg px-10 py-5 backdrop-blur-md bg-white/[0.02]" strength={0.2}>
              {t('landing_cta_secondary')}
            </MagneticButton>
          </motion.div>
        </div>
      </section>

      {/* ══════ CHAT PREVIEW (separate section, no overlap) ══════ */}
      <section className="relative z-10 pb-24 sm:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <TiltCard className="max-w-3xl mx-auto">
              <div className="relative rounded-2xl border border-white/[0.08] bg-obsidian-900/70 backdrop-blur-2xl p-1 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8)]">
                {/* window bar */}
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.05]">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-4 text-xs text-steel-500 font-mono tracking-wider">AI-Юрист • Консультация</span>
                </div>
                <div className="p-6 space-y-4">
                  <motion.div className="flex justify-end" initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                    <div className="chat-bubble-user text-sm max-w-[75%]">Как рассчитать алименты на 2 детей?</div>
                  </motion.div>
                  <motion.div className="flex gap-3 items-start" initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}>
                    <div className="w-8 h-8 rounded-lg chrome-gradient flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                      <Scale className="text-obsidian-950" size={14} strokeWidth={2.5} />
                    </div>
                    <div className="chat-bubble-ai text-sm flex-1 text-steel-300">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="segment-b2c text-[10px]">🏠 B2C — Автоопределение</span>
                      </div>
                      <p>Согласно <span className="text-white font-medium">ст. 139 Кодекса о браке и семье РК</span>, на двоих детей устанавливается <strong className="text-chrome-100">1/3 (33%) от дохода</strong> родителя...</p>
                      <span className="inline-flex items-center gap-1 text-xs text-chrome-400 mt-2">📎 adilet.zan.kz</span>
                    </div>
                  </motion.div>
                  <motion.div className="flex items-center gap-3 bg-obsidian-800/80 rounded-xl p-3 border border-white/[0.05]"
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.8 }}>
                    <span className="flex-1 text-sm text-steel-500 px-2">Задайте юридический вопрос...</span>
                    <div className="w-9 h-9 rounded-lg chrome-gradient flex items-center justify-center">
                      <ArrowRight className="text-obsidian-950" size={14} />
                    </div>
                  </motion.div>
                </div>
                {/* glow border */}
                <div className="absolute -inset-px rounded-2xl pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 100%)' }} />
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* ══════ STATS ══════ */}
      <section className="relative z-10 py-24 border-y border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <Reveal key={i} delay={i * 0.1} className="text-center">
                <p className="text-4xl sm:text-5xl font-extrabold metal-text mb-2">
                  {s.value === '24' ? '24' : <CountUp target={s.value} />}{s.suffix}
                </p>
                <p className="text-sm text-steel-400 font-medium tracking-wide">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CAPABILITIES (Bento Grid) ══════ */}
      <section id="capabilities" className="relative z-10 py-28">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <span className="text-xs text-chrome-400 uppercase tracking-[0.3em] font-bold mb-4 block">Экосистема</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              <span className="text-white">Возможности </span><span className="metal-text">платформы</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((c, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <TiltCard className="h-full">
                  <div className="glass-card h-full p-7 group cursor-default relative overflow-hidden border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-obsidian-800 border border-white/[0.08] flex items-center justify-center mb-5 text-chrome-300 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all duration-500">
                        {c.icon}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2 tracking-wide">{c.title}</h3>
                      <p className="text-sm text-steel-400 leading-relaxed">{c.desc}</p>
                    </div>
                    <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-white/[0.02] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section className="relative z-10 py-28 border-y border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <span className="text-xs text-chrome-400 uppercase tracking-[0.3em] font-bold mb-4 block">Процесс</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              <span className="text-white">Как это </span><span className="metal-text">работает</span>
            </h2>
          </Reveal>

          <div className="relative">
            <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

            {steps.map((step, i) => (
              <Reveal key={i} delay={i * 0.15} className="relative mb-16 last:mb-0">
                <div className={`flex items-start gap-6 sm:gap-12 ${i % 2 === 1 ? 'sm:flex-row-reverse' : ''}`}>
                  <div className="relative z-10 flex-shrink-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                    <div className="w-12 h-12 rounded-full chrome-gradient flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.1)] border-2 border-obsidian-950">
                      <span className="text-obsidian-950 font-bold text-sm">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                  </div>
                  <div className={`flex-1 glass-card p-6 border border-white/[0.06] ${i % 2 === 1 ? 'sm:mr-auto sm:ml-0 sm:max-w-[calc(50%-3rem)]' : 'sm:ml-auto sm:mr-0 sm:max-w-[calc(50%-3rem)]'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-chrome-300">{step.icon}</span>
                      <h3 className="text-lg font-bold text-white tracking-wide">{step.title}</h3>
                    </div>
                    <p className="text-sm text-steel-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="relative z-10 py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <div className="relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04)_0%,transparent_70%)]" />
              <div className="relative z-10">
                <motion.div className="w-20 h-20 rounded-3xl chrome-gradient mx-auto mb-8 flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.1)]"
                  animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                  <Scale className="text-obsidian-950" size={36} strokeWidth={2} />
                </motion.div>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
                  Начните прямо сейчас
                </h2>
                <p className="text-steel-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                  Получите мгновенную правовую консультацию по законодательству Республики Казахстан
                </p>
                <MagneticButton as={Link} to={user ? '/dashboard' : '/auth'}
                  className="btn-primary text-lg px-12 py-5 shadow-[0_0_50px_rgba(255,255,255,0.12)] hover:shadow-[0_0_80px_rgba(255,255,255,0.2)] group inline-flex" strength={0.3}>
                  <span className="flex items-center gap-2">
                    {user ? 'Открыть дашборд' : t('landing_cta')}
                    <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                  </span>
                </MagneticButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="relative z-10 border-t border-white/[0.04] bg-obsidian-950/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg chrome-gradient flex items-center justify-center">
                <Scale className="text-obsidian-950" size={14} strokeWidth={2.5} />
              </div>
              <span className="text-sm text-white font-bold">AI-<span className="metal-text">{t('landing_title_accent')}</span></span>
            </div>
            <p className="text-xs text-steel-500 text-center max-w-md">{t('footer_disclaimer')}</p>
            <a href="https://adilet.zan.kz" target="_blank" rel="noopener noreferrer"
              className="text-xs text-chrome-400 hover:text-white transition-colors flex items-center gap-1.5">
              📎 {t('footer_source')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
