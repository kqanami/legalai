import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from '../components/LanguageToggle';
import MagneticButton from '../components/MagneticButton';
import { GenerativeArtScene } from '../components/ui/generative-art-scene';
import { Spotlight } from '../components/ui/spotlight';
import {
  FileText, ArrowRight, Check,
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
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-20 border-b border-white/5 bg-black/50 backdrop-blur-md">
      <a href="#" onClick={(e) => smoothScrollTo(e, 'top')} className="flex items-center gap-2 text-white">
        <span className="font-bold text-xl tracking-tighter">LEGAL<span className="text-neutral-500">AI</span></span>
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

      <div className="flex items-center gap-4">
        <LanguageToggle />
        <Link to={user ? '/dashboard' : '/auth'} className="text-sm font-semibold text-white hover:text-neutral-300 transition-colors">
          {user ? 'Дашборд' : t('auth_login')}
        </Link>
      </div>
    </header>
  );
}

/* ═══════════════════════════════
   HERO
═══════════════════════════════ */
function Hero({ user }) {
  return (
    <section id="top" className="relative w-full h-screen bg-black overflow-hidden flex items-center">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      
      <div className="absolute inset-0 flex flex-col md:flex-row h-full">
        {/* Left Content */}
        <div className="flex-1 p-8 md:p-20 relative z-10 flex flex-col justify-center h-full pt-32 md:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block border border-white/10 px-3 py-1 rounded-full text-xs font-medium text-neutral-400 mb-6 bg-white/5 backdrop-blur-sm">
              AI Legal Engine v1.0
            </div>
            
            <h1 className="text-5xl md:text-[5.5rem] font-bold text-white leading-[1.05] tracking-tight mb-8">
              Правовой интеллект <br />
              <span className="text-neutral-500">нового поколения.</span>
            </h1>
            
            <p className="text-lg text-neutral-400 max-w-xl mb-10 leading-relaxed">
              Первая интеллектуальная правовая система Казахстана. Автоматизируйте рутину, анализируйте риски и принимайте решения в 10 раз быстрее.
            </p>

            <div className="flex items-center gap-6">
               <Link to={user ? '/dashboard' : '/auth'} className="bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2">
                 {user ? 'В панель' : 'Начать работу'} <ArrowRight size={18} />
               </Link>
            </div>
          </motion.div>
        </div>

        {/* Right 3D Scene */}
        <div className="flex-1 relative h-[50vh] md:h-full mt-10 md:mt-0">
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
    <section className="py-24 border-t border-white/5 bg-black">
      <div className="max-w-screen-xl mx-auto px-6 sm:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:divide-x divide-white/5">
          {[
             { value: "10x", label: "Ускорение работы" },
             { value: "99%", label: "Точность анализа" },
             { value: "24/7", label: "Доступность" },
             { value: "1000+", label: "Алгоритмов права" },
          ].map((m, i) => (
             <FadeUp key={i} delay={i * 0.1} className="flex flex-col md:pl-8 first:pl-0">
               <span className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">{m.value}</span>
               <span className="text-neutral-500 font-medium">{m.label}</span>
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
    <section id="capabilities" className="relative z-10 py-32 bg-black border-t border-white/5">
      <div className="max-w-screen-xl mx-auto px-6 sm:px-12">

        <FadeUp>
           <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">Экосистема.</h2>
           <p className="text-neutral-500 text-lg md:text-xl mb-16 max-w-2xl leading-relaxed">Всё что нужно для работы с законом: от консультаций до полного аудита договоров.</p>
        </FadeUp>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
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
    <section className="relative z-10 py-32 bg-neutral-950 border-t border-white/5 text-center">
      <div className="max-w-3xl mx-auto px-6">
        <FadeUp>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">Начните работу прямо сейчас.</h2>
          <p className="text-neutral-400 text-lg mb-10 leading-relaxed">
            Присоединяйтесь к передовым юристам и предпринимателям, которые уже оптимизировали свою работу с помощью ИИ.
          </p>
          <Link to={user ? '/dashboard' : '/auth'} className="inline-flex bg-white text-black px-10 py-5 rounded-full font-bold hover:bg-neutral-200 transition-colors items-center gap-2">
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
    <div className="min-h-screen bg-black overflow-hidden text-neutral-200 font-sans selection:bg-neutral-800 selection:text-white flex flex-col">
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
