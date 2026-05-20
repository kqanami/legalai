import { Link } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from '../components/LanguageToggle';
import KineticBackground from '../components/KineticBackground';
import MagneticButton from '../components/MagneticButton';
import Marquee from '../components/Marquee';
import SpotlightCard from '../components/SpotlightCard';
import { Scale, FileText, Globe, ArrowRight, Sparkles, Search, FileSearch, Building2, Zap, Users, Briefcase, Crown, Check, Shield, Clock, MessageSquare, ChevronRight, ArrowUpRight, Cpu, Database, Lock, BadgeCheck } from 'lucide-react';

/* ══════════════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════════════ */

const pricingPlans = [
  {
    name: 'FREEMIUM',
    price: '0',
    desc: 'Для быстрого знакомства с системой',
    features: ['3 премиум-ответа (Sonnet 3.5)', 'Безлимитный чат на базовой модели', '1 проверка контрагента по БИН', 'Доступ к базе кодексов РК'],
    cta: 'Попробовать бесплатно',
    popular: false,
    icon: <Sparkles className="text-emerald-400" size={22} />,
    accent: 'from-emerald-500/20 to-emerald-500/0',
  },
  {
    name: 'GO',
    price: '5,000',
    desc: 'Идеально для частных лиц и самозанятых',
    features: ['Безлимитный чат по всем НПА', 'Лимит 50 запросов в день', 'Claude 3.5 Sonnet интеллект', 'Двуязычная поддержка'],
    cta: 'Начать сейчас',
    popular: true,
    icon: <Zap className="text-chrome-300" size={22} />,
    accent: 'from-white/20 to-white/0',
  },
  {
    name: 'ИП',
    price: '19,990',
    desc: 'Для малого бизнеса и юристов',
    features: ['Доступ для команды (до 5 чел)', 'Базовый аудит договоров', 'Генерация исков и заявлений', 'История всех консультаций'],
    cta: 'Выбрать ИП',
    popular: false,
    icon: <Users className="text-chrome-200" size={22} />,
    accent: 'from-steel-400/20 to-steel-400/0',
  },
  {
    name: 'БИЗНЕС',
    price: '50,000',
    desc: 'Корпоративное решение',
    features: ['Глубокий Smart Audit (Opus)', 'Проверка по всем госреестрам', 'Персональный менеджер', 'API интеграция'],
    cta: 'Связаться с нами',
    popular: false,
    icon: <Briefcase className="text-chrome-100" size={22} />,
    accent: 'from-steel-300/20 to-steel-300/0',
  }
];

const stats = [
  { value: '15000', suffix: '+', label: 'Статей законодательства', icon: <Database size={20} /> },
  { value: '50', suffix: '+', label: 'Кодексов и законов РК', icon: <FileText size={20} /> },
  { value: '5', suffix: ' сек', label: 'Среднее время ответа', icon: <Clock size={20} /> },
  { value: '24', suffix: '/7', label: 'Доступность системы', icon: <Shield size={20} /> },
];

const steps = [
  { icon: <MessageSquare size={22} />, title: 'Задайте вопрос', desc: 'На русском или казахском языке — система понимает оба', num: '01' },
  { icon: <Search size={22} />, title: 'AI ищет по НПА', desc: 'Поиск по 15,000+ статьям кодексов и законов РК', num: '02' },
  { icon: <FileText size={22} />, title: 'Получите ответ', desc: 'С точными ссылками на статьи и источники', num: '03' },
];

const capabilities = [
  { icon: <Scale size={28} strokeWidth={1.5} />, title: 'AI-консультации', desc: 'Мгновенные ответы по любым правовым вопросам с цитатами из кодексов РК', span: 'lg:col-span-2', featured: true },
  { icon: <FileSearch size={28} strokeWidth={1.5} />, title: 'Аудит договоров', desc: 'Глубокая проверка документов на соответствие законодательству', span: '', featured: false },
  { icon: <FileText size={28} strokeWidth={1.5} />, title: 'Генерация документов', desc: 'Автоматическое создание исков, заявлений и договоров', span: '', featured: false },
  { icon: <Building2 size={28} strokeWidth={1.5} />, title: 'Проверка контрагентов', desc: 'Полный анализ юридических лиц по БИН через открытые базы', span: '', featured: false },
  { icon: <Globe size={28} strokeWidth={1.5} />, title: 'Двуязычность', desc: 'Полная поддержка казахского и русского языков', span: 'lg:col-span-2', featured: true },
];

const trustBadges = [
  { icon: <Lock size={16} />, label: 'End-to-End шифрование' },
  { icon: <BadgeCheck size={16} />, label: 'Данные в КЗ' },
  { icon: <Cpu size={16} />, label: 'Claude 3.5 & Gemini' },
  { icon: <Shield size={16} />, label: 'GDPR-ready' },
];

/* ─── Helpers ─── */

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

function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { damping: 20 });
  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={className}>{children}</motion.div>
  );
}

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >{children}</motion.div>
  );
}

/* Horizontal gradient divider */
function GradientDivider() {
  return (
    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
  );
}

/* ─── Section heading ─── */
function SectionHeading({ tag, title, accent, center = true }) {
  return (
    <Reveal className={`${center ? 'text-center' : ''} mb-16 sm:mb-20`}>
      <motion.span
        className="inline-flex items-center gap-2 text-[11px] text-chrome-400 uppercase tracking-[0.3em] font-bold mb-5"
        initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ delay: 0.1 }}>
        <span className="w-8 h-px bg-gradient-to-r from-chrome-500/60 to-transparent" />
        {tag}
        <span className="w-8 h-px bg-gradient-to-l from-chrome-500/60 to-transparent" />
      </motion.span>
      <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
        <span className="text-white">{title} </span><span className="metal-text">{accent}</span>
      </h2>
    </Reveal>
  );
}


/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 60]);

  // Scrolled header
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-obsidian-950 overflow-hidden">
      {/* ══════ BACKGROUNDS ══════ */}
      <div className="fixed inset-0 z-0"><KineticBackground variant="landing" /></div>
      {/* Noise overlay */}
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px' }} />

      {/* ══════ HEADER ══════ */}
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'backdrop-blur-2xl bg-obsidian-950/80 border-b border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.4)]' : 'bg-transparent border-b border-transparent'}`}
        initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div className="w-10 h-10 rounded-xl chrome-gradient flex items-center justify-center shadow-lg"
              whileHover={{ rotate: [0, -5, 5, 0], scale: 1.08 }} transition={{ duration: 0.4 }}>
              <Scale className="text-obsidian-950" size={20} strokeWidth={2.5} />
            </motion.div>
            <span className="text-white font-bold text-lg tracking-wide">AI-<span className="metal-text">{t('landing_title_accent')}</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <MagneticButton as={Link} to={user ? '/dashboard' : '/auth'}
              className="btn-primary text-sm px-5 py-2.5 shadow-[0_0_20px_rgba(255,255,255,0.08)]">
              {user ? 'Dashboard' : t('auth_login')}
            </MagneticButton>
          </div>
        </div>
      </motion.header>


      {/* ══════ HERO ══════ */}
      <section ref={heroRef} className="relative z-10 pt-32 sm:pt-44 pb-8 sm:pb-12 min-h-[90vh] flex flex-col items-center justify-center">
        {/* Floating particles for extra wow factor */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-chrome-400 rounded-full"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                opacity: Math.random() * 0.5 + 0.1,
              }}
              animate={{
                y: [null, Math.random() * -100 - 50],
                opacity: [null, 0],
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>

        <motion.div className="max-w-6xl mx-auto px-6 text-center relative z-10" style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}>

          {/* Badge */}
          <motion.div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md mb-8 hover:bg-white/[0.05] transition-colors cursor-default"
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.3, duration: 0.6 }}>
            <motion.span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="text-xs text-chrome-300 font-medium tracking-wider uppercase">Система активна • AI Legal Engine v1.0</span>
          </motion.div>

          {/* Headline — staggered word reveal */}
          <motion.h1 className="text-5xl sm:text-7xl lg:text-[6rem] font-extrabold tracking-tight leading-[1.05] mb-6 drop-shadow-2xl"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.35 }}>
            <motion.span className="text-white inline-block"
              initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              Правовой интеллект
            </motion.span>
            <br />
            <motion.span className="metal-text inline-block relative"
              initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}>
              нового поколения
              <motion.div 
                className="absolute -bottom-4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-chrome-500/50 to-transparent blur-[2px]"
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.span>
          </motion.h1>

          {/* Sub */}
          <motion.p className="text-lg sm:text-xl text-steel-400 max-w-2xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}>
            {t('landing_subtitle')}
          </motion.p>

          {/* Action buttons */}
          <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.6 }}>
            <MagneticButton as={Link} to="/auth" className="btn-primary px-8 py-4 text-base w-full sm:w-auto flex items-center justify-center gap-2 group relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">{t('landing_cta_main')} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></span>
              <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 ease-out" />
            </MagneticButton>
            <MagneticButton as="a" href="#capabilities" className="btn-secondary px-8 py-4 text-base w-full sm:w-auto flex items-center justify-center gap-2 border border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.05] transition-all">
              {t('landing_cta_secondary')} <Search size={18} className="text-chrome-500" />
            </MagneticButton>
          </motion.div>
        </motion.div>

        {/* Floating AI chat preview — Parallax */}
        <div className="w-full max-w-5xl mx-auto mt-20 px-6 perspective-[2000px] relative z-10 hidden sm:block">
          
          {/* Decorative floating blurred orbs */}
          <div className="absolute top-1/4 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Floating UI Elements (Parallax) */}
          <motion.div 
            className="absolute -left-12 top-1/4 z-20"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.2, duration: 0.8 }}
            animate={{ y: [0, -10, 0] }}
            style={{ animationDuration: '6s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' }}
          >
            <div className="bg-obsidian-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Shield className="text-emerald-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-steel-400 font-medium">Точность ссылок</p>
                <p className="text-white font-bold text-lg">99.9%</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="absolute -right-8 bottom-1/3 z-20"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.4, duration: 0.8 }}
            animate={{ y: [0, 15, 0] }}
            style={{ animationDuration: '8s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' }}
          >
            <div className="bg-obsidian-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Zap className="text-amber-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-steel-400 font-medium">Отклик AI</p>
                <p className="text-white font-bold text-lg">&lt; 2 сек</p>
              </div>
            </div>
          </motion.div>

          <Reveal delay={1.0} duration={0.8}>
            <TiltCard>
              <div className="relative rounded-[2rem] border border-white/[0.06] bg-obsidian-950/80 backdrop-blur-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8),0_0_60px_rgba(245,158,11,0.03)] overflow-hidden">
                {/* Accent glow top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-24 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.05] bg-obsidian-900/50">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <span className="text-[10px] text-emerald-400/80 font-medium tracking-widest uppercase">Система AI-Юрист активна</span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-5">
                  {/* User message */}
                  <motion.div className="flex justify-end" initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.6 }}>
                    <div className="chat-bubble-user text-sm max-w-[75%] shadow-lg">Как рассчитать алименты на 2 детей?</div>
                  </motion.div>

                  {/* AI message */}
                  <motion.div className="flex gap-3 items-start" initial={{ opacity: 0, x: -40 }}
                    whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.5, duration: 0.6 }}>
                    <div className="w-9 h-9 rounded-xl chrome-gradient flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                      <Scale className="text-obsidian-950" size={15} strokeWidth={2.5} />
                    </div>
                    <div className="chat-bubble-ai text-sm flex-1 text-steel-300 relative overflow-hidden group">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="segment-b2c text-[10px] px-2 py-1 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">B2C — Автоопределение</span>
                      </div>
                      <p className="leading-relaxed">Согласно <span className="text-white font-medium">ст. 139 Кодекса о браке и семье РК</span>, на двоих детей устанавливается <strong className="text-chrome-100 drop-shadow-md">1/3 (33%) от дохода</strong> родителя. Минимальный размер алиментов не может быть ниже 1/3 величины прожиточного минимума.</p>
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.05]">
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-chrome-400 font-medium">
                          <FileText size={11} /> adilet.zan.kz
                        </span>
                        <span className="text-obsidian-600">•</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-steel-500">
                          <Clock size={10} /> 2.3 сек
                        </span>
                      </div>
                      
                      {/* Sweep hover effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                    </div>
                  </motion.div>

                  {/* Input bar */}
                  <motion.div className="flex items-center gap-3 bg-obsidian-900/80 backdrop-blur-md rounded-2xl p-3 border border-white/[0.08] shadow-inner"
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.8, duration: 0.5 }}>
                    <span className="flex-1 text-sm text-steel-500 px-3 font-mono">Задайте юридический вопрос...</span>
                    <div className="w-10 h-10 rounded-xl chrome-gradient flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.15)] cursor-pointer hover:scale-105 transition-transform">
                      <ArrowRight className="text-obsidian-950" size={16} />
                    </div>
                  </motion.div>
                </div>

                {/* Bottom glow */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* ══════ TRUSTED BY MARQUEE ══════ */}
      <section className="relative z-10 w-full overflow-hidden pb-12">
        <p className="text-center text-xs text-steel-500 font-bold uppercase tracking-[0.2em] mb-6">Технологии & Интеграции</p>
        <Marquee 
          items={[
            <span className="text-xl font-bold text-chrome-400 flex items-center gap-2"><Cpu size={24} /> Neural Processing</span>,
            <span className="text-xl font-bold text-chrome-400 flex items-center gap-2"><Database size={24} /> Adilet.zan.kz API</span>,
            <span className="text-xl font-bold text-chrome-400 flex items-center gap-2"><Lock size={24} /> End-to-End Encryption</span>,
            <span className="text-xl font-bold text-chrome-400 flex items-center gap-2"><Shield size={24} /> E-Gov Data Ready</span>,
            <span className="text-xl font-bold text-chrome-400 flex items-center gap-2"><Zap size={24} /> Instant Responses</span>,
            <span className="text-xl font-bold text-chrome-400 flex items-center gap-2"><Globe size={24} /> Multilingual (KZ/RU)</span>
          ]}
          speed={60}
        />
      </section>


      {/* ══════ STATS ══════ */}
      <section className="relative z-10 py-20 sm:py-28">
        <GradientDivider />
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {stats.map((s, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="landing-stat-card group">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 text-chrome-500/60 group-hover:text-chrome-300 group-hover:border-white/[0.12] group-hover:bg-white/[0.06] transition-all duration-500">
                    {s.icon}
                  </div>
                  <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold metal-text mb-1.5 tracking-tight">
                    {s.value === '24' ? '24' : <CountUp target={s.value} />}{s.suffix}
                  </p>
                  <p className="text-xs sm:text-sm text-steel-500 font-medium">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <GradientDivider />
      </section>


      {/* ══════ CAPABILITIES (Bento Grid) ══════ */}
      <section id="capabilities" className="relative z-10 py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeading tag="Экосистема" title="Возможности" accent="платформы" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {capabilities.map((c, i) => (
              <Reveal key={i} delay={i * 0.08} className={c.span}>
                <SpotlightCard className="h-full p-[1px]">
                  <div className={`landing-capability-card group h-full w-full bg-obsidian-950/80 rounded-2xl ${c.featured ? 'lg:flex lg:items-center lg:gap-8' : ''}`}>
                    {/* Accent line top */}
                    <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10 flex-shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-obsidian-800/80 border border-white/[0.06] flex items-center justify-center mb-5 lg:mb-0 text-chrome-400 group-hover:text-white group-hover:border-white/[0.15] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.06)] transition-all duration-500">
                        {c.icon}
                      </div>
                    </div>

                    <div className="relative z-10 flex-1">
                      <h3 className="text-lg font-bold text-white mb-2 tracking-wide group-hover:text-chrome-100 transition-colors">{c.title}</h3>
                      <p className="text-sm text-steel-400 leading-relaxed group-hover:text-steel-300 transition-colors">{c.desc}</p>
                    </div>

                    {/* Hover glow inside card */}
                    <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-white/[0.015] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* ══════ HOW IT WORKS ══════ */}
      <section className="relative z-10 py-24 sm:py-32">
        <GradientDivider />
        <div className="max-w-5xl mx-auto px-6 py-24">
          <SectionHeading tag="Процесс" title="Как это" accent="работает" />

          {/* Desktop: Horizontal steps */}
          <div className="hidden sm:grid grid-cols-3 gap-6 relative">
            {/* Connecting line */}
            <div className="absolute top-10 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-chrome-500/20 via-chrome-500/40 to-chrome-500/20" />

            {steps.map((step, i) => (
              <Reveal key={i} delay={i * 0.15} className="relative">
                <div className="text-center">
                  {/* Circle number */}
                  <div className="w-20 h-20 rounded-full chrome-gradient mx-auto mb-6 flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.08)] border-4 border-obsidian-950 relative z-10">
                    <span className="text-obsidian-950 font-black text-lg">{step.num}</span>
                  </div>

                  <div className="glass-card p-6 border border-white/[0.06] rounded-2xl">
                    <div className="flex items-center justify-center gap-2.5 mb-3 text-chrome-300">
                      {step.icon}
                      <h3 className="text-lg font-bold text-white tracking-wide">{step.title}</h3>
                    </div>
                    <p className="text-sm text-steel-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Mobile: Vertical steps */}
          <div className="sm:hidden space-y-8">
            {steps.map((step, i) => (
              <Reveal key={i} delay={i * 0.15}>
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-full chrome-gradient flex items-center justify-center flex-shrink-0 shadow-lg border-2 border-obsidian-950">
                    <span className="text-obsidian-950 font-black text-sm">{step.num}</span>
                  </div>
                  <div className="glass-card flex-1 p-5 border border-white/[0.06] rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 text-chrome-300">
                      {step.icon}
                      <h3 className="text-base font-bold text-white">{step.title}</h3>
                    </div>
                    <p className="text-sm text-steel-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <GradientDivider />
      </section>


      {/* ══════ PRICING ══════ */}
      <section id="pricing" className="relative z-10 py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading tag="Тарифные планы" title="Выберите свой уровень" accent="поддержки" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {pricingPlans.map((plan, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <TiltCard className="h-full">
                  <div className={`h-full flex flex-col relative overflow-hidden rounded-2xl ${plan.popular ? 'landing-pricing-popular' : 'landing-pricing-card'}`}>
                    {/* Popular badge */}
                    {plan.popular && (
                      <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-chrome-300 to-transparent" />
                    )}
                    {plan.popular && (
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-chrome-200 uppercase tracking-widest flex items-center gap-1.5">
                        <Crown size={10} /> Популярный
                      </div>
                    )}

                    <div className="p-7 sm:p-8 flex flex-col flex-1">
                      {/* Icon + name */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                          {plan.icon}
                        </div>
                        <span className="text-xs font-bold text-steel-400 tracking-widest uppercase">{plan.name}</span>
                      </div>

                      {/* Price */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight">{plan.price}</span>
                          <span className="text-lg font-bold text-steel-400">₸</span>
                          {plan.price !== '0' && <span className="text-xs text-steel-500 ml-1">/ мес</span>}
                        </div>
                        <p className="text-xs text-steel-500 mt-2 leading-relaxed">{plan.desc}</p>
                      </div>

                      {/* Features */}
                      <div className="space-y-3.5 mb-8 flex-1">
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-px">
                              <Check size={12} className="text-emerald-400" />
                            </div>
                            <span className="text-xs text-steel-300 leading-relaxed">{feat}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA */}
                      <MagneticButton as={Link} to={user ? '/dashboard' : '/auth'}
                        className={`w-full py-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${plan.popular ? 'btn-primary' : 'bg-white/[0.04] text-white hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15]'}`}>
                        {plan.cta}
                        <ArrowRight size={14} />
                      </MagneticButton>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* ══════ FINAL CTA ══════ */}
      <section className="relative z-10 py-32 sm:py-40">
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          {/* Background radial */}
          <div className="absolute inset-0 -top-20 -bottom-20 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

          <Reveal>
            <div className="relative z-10">
              <motion.div className="w-20 h-20 rounded-3xl chrome-gradient mx-auto mb-10 flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.1)]"
                animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
                <Scale className="text-obsidian-950" size={36} strokeWidth={2} />
              </motion.div>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-5 tracking-tight leading-[1.1]">
                Начните прямо<br /><span className="metal-text">сейчас</span>
              </h2>
              <p className="text-steel-400 text-lg sm:text-xl mb-12 max-w-xl mx-auto leading-relaxed">
                Получите мгновенную правовую консультацию по законодательству Республики Казахстан
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <MagneticButton as={Link} to={user ? '/dashboard' : '/auth'}
                  className="btn-primary text-lg px-12 py-5 shadow-[0_0_50px_rgba(255,255,255,0.12)] hover:shadow-[0_0_80px_rgba(255,255,255,0.2)] group" strength={0.3}>
                  <span className="flex items-center gap-2">
                    {user ? 'Открыть дашборд' : t('landing_cta')}
                    <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                  </span>
                </MagneticButton>
                <MagneticButton as="a" href="#pricing"
                  className="btn-secondary text-base px-8 py-4 backdrop-blur-md" strength={0.2}>
                  <span className="flex items-center gap-2">
                    Тарифы
                    <ChevronRight size={16} />
                  </span>
                </MagneticButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════ FOOTER ══════ */}
      <footer className="relative z-10 border-t border-white/[0.04] bg-obsidian-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg chrome-gradient flex items-center justify-center shadow-md">
                  <Scale className="text-obsidian-950" size={15} strokeWidth={2.5} />
                </div>
                <span className="text-base text-white font-bold">AI-<span className="metal-text">{t('landing_title_accent')}</span></span>
              </div>
              <p className="text-xs text-steel-500 leading-relaxed max-w-xs">{t('footer_disclaimer')}</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-bold text-chrome-400 uppercase tracking-widest mb-4">Продукт</h4>
              <ul className="space-y-2.5">
                {['AI-Консультант', 'Аудит договоров', 'Генератор документов', 'Проверка контрагентов'].map((item, i) => (
                  <li key={i}>
                    <Link to={user ? '/dashboard' : '/auth'} className="text-xs text-steel-500 hover:text-white transition-colors duration-300 flex items-center gap-1.5 group">
                      <ChevronRight size={10} className="text-steel-600 group-hover:text-chrome-400 transition-colors" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-bold text-chrome-400 uppercase tracking-widest mb-4">Правовая база</h4>
              <ul className="space-y-2.5">
                {['Гражданский кодекс', 'Трудовой кодекс', 'Налоговый кодекс', 'КоАП РК'].map((item, i) => (
                  <li key={i}>
                    <a href="https://adilet.zan.kz" target="_blank" rel="noopener noreferrer" className="text-xs text-steel-500 hover:text-white transition-colors duration-300 flex items-center gap-1.5 group">
                      <ChevronRight size={10} className="text-steel-600 group-hover:text-chrome-400 transition-colors" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Source */}
            <div>
              <h4 className="text-xs font-bold text-chrome-400 uppercase tracking-widest mb-4">Источники данных</h4>
              <a href="https://adilet.zan.kz" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-chrome-400 hover:text-white transition-colors group bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                <FileText size={14} className="group-hover:text-chrome-200 transition-colors" />
                <div>
                  <span className="block font-semibold">Adilet.zan.kz</span>
                  <span className="text-steel-500 text-[10px]">{t('footer_source')}</span>
                </div>
                <ArrowUpRight size={12} className="ml-auto text-steel-600 group-hover:text-chrome-300 transition-colors" />
              </a>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-steel-600">© {new Date().getFullYear()} AI-Legal KZ. Все права защищены.</p>
            <div className="flex items-center gap-6">
              {trustBadges.slice(0, 3).map((badge, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[10px] text-steel-600">
                  <span className="text-steel-600/50">{badge.icon}</span>
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
