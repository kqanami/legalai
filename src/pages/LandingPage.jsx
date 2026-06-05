import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from '../components/LanguageToggle';
import MagneticButton from '../components/MagneticButton';
import { GenerativeArtScene } from '../components/ui/generative-art-scene';
import { Spotlight } from '../components/ui/spotlight';
import {
  FileText, ArrowRight, Check, Menu, X,
  MessagesSquare, Shield, Search, Mail, Phone, MapPin
} from 'lucide-react';

/* ═══════════════════════════════
   DATA
═══════════════════════════════ */
const PRICING = [
  {
    name: 'FREEMIUM', price: '0', period: null, free: true, popular: false,
    desc: 'Быстрое знакомство с системой',
    features: ['3 премиум-ответа (Sonnet 3.5)', 'Безлимитный базовый чат', '1 проверка по БИН', 'База кодексов РК'],
    cta: 'Начать бесплатно',
  },
  {
    name: 'GO', price: '5 000', period: '/мес', free: false, popular: true,
    desc: 'Для частных лиц и самозанятых',
    features: ['Безлимитный чат по НПА', '50 запросов в день', 'Claude 3.5 Sonnet', 'Двуязычная поддержка'],
    cta: 'Выбрать план',
  },
  {
    name: 'ИП', price: '19 990', period: '/мес', free: false, popular: false,
    desc: 'Малый бизнес и юристы',
    features: ['Команда до 5 человек', 'Аудит договоров', 'Генерация документов', 'История консультаций'],
    cta: 'Выбрать план',
  },
  {
    name: 'БИЗНЕС', price: '50 000', period: '/мес', free: false, popular: false,
    desc: 'Корпоративное решение',
    features: ['Smart Audit (Opus)', 'Все госреестры', 'Персональный менеджер', 'API интеграция'],
    cta: 'Связаться',
  },
];

/* ═══════════════════════════════
   ATOMS
═══════════════════════════════ */

const smoothScrollTo = (e, targetId) => {
  e.preventDefault();
  const element = document.getElementById(targetId);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
};

import { FadeUp, TiltCard } from '../components/ui/animations';
import { Footer } from '../components/Footer';

/* ═══════════════════════════════
   HEADER
═══════════════════════════════ */
function Header({ user, t }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-white/5 bg-black/50 px-4 backdrop-blur-md sm:h-20 sm:px-6 md:px-12">
      <a href="#" onClick={(e) => smoothScrollTo(e, 'top')} className="flex items-center gap-2 text-white relative z-50">
        <span className="text-lg font-bold tracking-tighter sm:text-xl">LEGAL<span className="text-neutral-500">AI</span></span>
      </a>

      <nav className="hidden md:flex items-center gap-8">
        <a 
          href="/#capabilities" 
          onClick={(e) => smoothScrollTo(e, 'capabilities')}
          className="text-xs font-semibold tracking-[0.1em] uppercase text-neutral-400 hover:text-white transition-colors"
        >
          Возможности
        </a>
        <Link 
          to="/pricing"
          className="text-xs font-semibold tracking-[0.1em] uppercase text-neutral-400 hover:text-white transition-colors"
        >
          Тарифы
        </Link>
      </nav>

      <div className="flex items-center gap-3 sm:gap-4 relative z-50">
        <LanguageToggle />
        <Link to={user ? '/dashboard' : '/auth'} className="hidden md:block text-xs font-semibold text-white transition-colors hover:text-neutral-300 sm:text-sm">
          {user ? 'Дашборд' : t('auth_login')}
        </Link>
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-white p-1 focus:outline-none">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/10 p-6 flex flex-col gap-6 shadow-2xl md:hidden z-40"
          >
             <a href="/#capabilities" onClick={(e) => { smoothScrollTo(e, 'capabilities'); setIsOpen(false); }} className="text-sm font-bold text-white uppercase tracking-widest p-2">Возможности</a>
             <Link to="/pricing" onClick={() => setIsOpen(false)} className="text-sm font-bold text-white uppercase tracking-widest p-2">Тарифы</Link>
             <div className="h-px w-full bg-white/10 my-2" />
             <Link to={user ? '/dashboard' : '/auth'} className="bg-white text-black text-center py-4 rounded-xl font-bold">
               {user ? 'Перейти в Дашборд' : t('auth_login')}
             </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ═══════════════════════════════
   HERO
═══════════════════════════════ */
function Hero({ user }) {
  return (
    <section id="top" className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-black md:h-screen">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      
      <div className="relative inset-0 flex min-h-[100svh] w-full flex-col md:absolute md:h-full md:flex-row">
        {/* Left Content */}
        <div className="relative z-10 flex h-auto flex-1 flex-col justify-center px-6 pb-12 pt-28 sm:px-8 sm:pt-32 md:h-full md:p-20 md:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <div className="inline-block border border-white/10 px-3 py-1 rounded-full text-xs font-medium text-neutral-400 mb-6 bg-white/5 backdrop-blur-sm">
              AI Legal Engine v1.0
            </div>
            
            <h1 className="mb-5 text-[2.25rem] font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:mb-8 md:text-[5.5rem]">
              Правовой интеллект <br className="hidden sm:block"/>
              <span className="text-neutral-500">нового поколения.</span>
            </h1>
            
            <p className="mb-8 max-w-xl text-[15px] leading-relaxed text-neutral-400 sm:text-lg md:mb-10">
              Первая интеллектуальная правовая система Казахстана. Автоматизируйте рутину, анализируйте риски и принимайте решения в 10 раз быстрее.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
               <Link to={user ? '/dashboard' : '/auth'} className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-bold text-black transition-colors hover:bg-neutral-200 sm:w-auto sm:px-8 sm:py-4 sm:text-base">
                 {user ? 'В панель' : 'Начать работу'} <ArrowRight size={18} />
               </Link>
            </div>
          </motion.div>
        </div>

        {/* Right 3D Scene */}
        <div className="relative mt-auto h-[40svh] min-h-[250px] w-full flex-1 md:h-full opacity-60 md:opacity-100 mix-blend-screen md:mix-blend-normal">
          <GenerativeArtScene />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════
   METRICS SECTION
═══════════════════════════════ */
function Metrics() {
  return (
    <section className="border-t border-white/5 bg-black py-14 sm:py-20 md:py-24">
      <div className="max-w-screen-xl mx-auto px-6 sm:px-12">
        <div className="grid grid-cols-2 gap-y-10 gap-x-6 divide-white/5 md:grid-cols-4 md:gap-8 md:divide-x">
          {[
             { value: "10x", label: "Ускорение работы" },
             { value: "99%", label: "Точность анализа" },
             { value: "24/7", label: "Доступность" },
             { value: "1000+", label: "Алгоритмов права" },
          ].map((m, i) => (
             <FadeUp key={i} delay={i * 0.1} className="flex flex-col md:pl-8 first:pl-0">
               <span className="text-4xl md:text-5xl font-bold text-white mb-1 md:mb-2 tracking-tight">{m.value}</span>
               <span className="text-xs md:text-sm text-neutral-500 font-medium">{m.label}</span>
             </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════
   BENTO CAPABILITIES
═══════════════════════════════ */
function Capabilities() {
  return (
    <section id="capabilities" className="relative z-10 border-t border-white/5 bg-black py-20 sm:py-24 md:py-32">
      <div className="max-w-screen-xl mx-auto px-6 sm:px-12">

        <FadeUp>
           <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">Экосистема.</h2>
           <p className="text-neutral-500 text-lg md:text-xl mb-16 max-w-2xl leading-relaxed">Всё что нужно для работы с законом: от консультаций до полного аудита договоров.</p>
        </FadeUp>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto md:auto-rows-[300px]">
          {/* Card 1 */}
          <FadeUp delay={0.1} className="md:col-span-2 relative">
            <TiltCard>
              <MessagesSquare className="text-neutral-600 mb-6" size={32} />
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">AI-Консультант 24/7</h3>
                <p className="text-neutral-400 leading-relaxed max-w-md">Мгновенные ответы с точными цитатами из кодексов РК по любому правовому вопросу.</p>
              </div>
            </TiltCard>
          </FadeUp>

          {/* Card 2 */}
          <FadeUp delay={0.2} className="md:col-span-1 relative">
            <TiltCard>
              <FileText className="text-neutral-600 mb-6" size={32} />
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Документы</h3>
                <p className="text-neutral-400 leading-relaxed">Генерация исков, претензий и договоров за секунды.</p>
              </div>
            </TiltCard>
          </FadeUp>

          {/* Card 3 */}
          <FadeUp delay={0.3} className="md:col-span-1 relative">
            <TiltCard>
              <Search className="text-neutral-600 mb-6" size={32} />
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Проверка компаний</h3>
                <p className="text-neutral-400 leading-relaxed">Анализ юрлиц по БИН через открытые реестры.</p>
              </div>
            </TiltCard>
          </FadeUp>

          {/* Card 4 */}
          <FadeUp delay={0.4} className="md:col-span-2 relative">
            <TiltCard>
              <Shield className="text-neutral-600 mb-6" size={32} />
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Глубокий аудит рисков</h3>
                <p className="text-neutral-400 leading-relaxed max-w-md">Анализ ваших договоров на скрытые риски и несоответствия по нормам Гражданского кодекса.</p>
              </div>
            </TiltCard>
          </FadeUp>
        </div>

      </div>
    </section>
  );
}

/* ═══════════════════════════════
   FINAL CTA
═══════════════════════════════ */
function FinalCta({ user }) {
  return (
    <section className="relative z-10 border-t border-white/5 bg-neutral-950 py-20 text-center sm:py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-6">
        <FadeUp>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">Начните работу прямо сейчас.</h2>
          <p className="text-neutral-400 text-base sm:text-lg mb-10 leading-relaxed">
            Присоединяйтесь к передовым юристам и предпринимателям, которые уже оптимизировали свою работу с помощью ИИ.
          </p>
          <Link to={user ? '/dashboard' : '/auth'} className="flex sm:inline-flex justify-center w-full sm:w-auto bg-white text-black px-8 sm:px-10 py-4 sm:py-5 rounded-full font-bold hover:bg-neutral-200 transition-colors items-center gap-2">
            Создать аккаунт бесплатно <ArrowRight size={18} />
          </Link>
        </FadeUp>
      </div>
    </section>
  );
}

/* ═══════════════════════════════
   ROOT
═══════════════════════════════ */
export default function LandingPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-black font-sans text-neutral-200 selection:bg-neutral-800 selection:text-white">
      <Header user={user} t={t} />
      
      <main className="flex-1">
        <Hero user={user} />
        <Metrics />
        <Capabilities />
        <FinalCta user={user} />
      </main>

      <Footer />
    </div>
  );
}
