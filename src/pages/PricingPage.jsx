import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import { FadeUp, TiltCard } from '../components/ui/animations';
import { Footer } from '../components/Footer';
import PaymentModal from '../components/PaymentModal';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

const PRICING = [
  {
    id: 'freemium', name: 'FREEMIUM', price: '0', period: null, free: true, popular: false,
    desc: 'Быстрое знакомство с системой',
    features: ['3 премиум-ответа (Sonnet 3.5)', 'Безлимитный базовый чат', '1 проверка по БИН', 'База кодексов РК'],
    cta: 'Начать бесплатно',
  },
  {
    id: 'go', name: 'GO', price: '5 000', period: '/мес', free: false, popular: true,
    desc: 'Для частных лиц и самозанятых',
    features: ['Безлимитный чат по НПА', '50 запросов в день', 'Claude 3.5 Sonnet', 'Двуязычная поддержка'],
    cta: 'Выбрать план',
  },
  {
    id: 'ip', name: 'ИП', price: '19 990', period: '/мес', free: false, popular: false,
    desc: 'Малый бизнес и юристы',
    features: ['Команда до 5 человек', 'Аудит договоров', 'Генерация документов', 'История консультаций'],
    cta: 'Выбрать план',
  },
  {
    id: 'business', name: 'БИЗНЕС', price: '50 000', period: '/мес', free: false, popular: false,
    desc: 'Корпоративное решение',
    features: ['Smart Audit (Opus)', 'Все госреестры', 'Персональный менеджер', 'API интеграция'],
    cta: 'Связаться',
  },
];

function PricingCard({ p, i, user, onPurchase }) {
  const isCurrentPlan = user && user.plan === p.id;

  return (
    <FadeUp delay={i * 0.05} className="relative md:col-span-1 h-full">
      <div className={`flex flex-col h-full rounded-[2rem] bg-white/[0.01] border ${isCurrentPlan ? 'border-white/30 bg-white/[0.05]' : 'border-white/5'} transition-all relative overflow-hidden group hover:border-white/20 p-8`}>
        {isCurrentPlan && (
          <div className="absolute top-0 right-0 bg-white text-black text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl z-20">
            Текущий
          </div>
        )}
        
        <div className="mb-10">
          <span className="text-[10px] font-black tracking-widest uppercase text-white/40 mb-4 block">{p.name}</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-5xl font-black text-white tracking-tighter">{p.price}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{p.period ? `₸${p.period}` : ''}</span>
          </div>
          <p className="text-xs text-white/60 mt-6 h-10 leading-relaxed font-bold">{p.desc}</p>
        </div>

        <div className="flex-1 space-y-4 mb-12">
          {p.features.map((f, fi) => (
             <div key={fi} className="flex items-start gap-4">
               <div className="w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0">
                 <Check size={12} className="text-white" />
               </div>
               <span className="text-[11px] font-bold text-white/80">{f}</span>
             </div>
          ))}
        </div>

        <div>
          {user ? (
            <button
              onClick={() => !isCurrentPlan && onPurchase(p)}
              disabled={isCurrentPlan}
              className={`w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center ${
                isCurrentPlan
                  ? 'bg-white/[0.05] text-white/40 border border-white/5 cursor-default'
                  : p.popular 
                    ? 'bg-white text-black hover:bg-neutral-200' 
                    : 'bg-white/[0.05] text-white hover:bg-white/[0.1] border border-white/10'
              }`}
            >
              {isCurrentPlan ? 'Ваш тариф' : 'Купить'}
            </button>
          ) : (
            <Link 
              to="/auth" 
              className={`w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center ${
                p.popular 
                  ? 'bg-white text-black hover:bg-neutral-200' 
                  : 'bg-white/[0.05] text-white hover:bg-white/[0.1] border border-white/10'
              }`}
            >
              {p.cta}
            </Link>
          )}
        </div>
      </div>
    </FadeUp>
  );
}

export default function PricingPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const navigate = useNavigate();

  const handlePurchase = (plan) => {
    setSelectedPlan(plan);
    setIsPaymentOpen(true);
  };
  return (
    <div className="h-screen w-full bg-[#050505] text-white font-sans overflow-hidden flex flex-col selection:bg-white/20">
      <header className="flex-shrink-0 flex items-center justify-between px-6 lg:px-12 h-20 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md z-50">
        <Link to="/" className="flex items-center gap-2 text-white">
          <span className="font-black text-xl tracking-tighter">LEGAL<span className="text-white/40">AI</span></span>
        </Link>
        <div className="flex items-center gap-6">
          <LanguageToggle />
          {user ? (
            <button 
              onClick={() => navigate('/dashboard')}
              className="h-10 px-6 bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} /> В дашборд
            </button>
          ) : (
            <Link to="/auth" className="h-10 px-6 bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center">
              {t('auth_login')}
            </Link>
          )}
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <div className="py-24 max-w-screen-xl w-full mx-auto px-6 sm:px-12">
          <FadeUp className="text-center mb-20">
            <h1 className="text-5xl lg:text-7xl font-black text-white mb-8 tracking-tighter">Инвестиция в <br/>эффективность.</h1>
            <p className="text-white/40 text-sm md:text-base max-w-2xl mx-auto leading-relaxed font-bold tracking-widest uppercase text-[10px]">Выберите план, который лучше всего подходит для ваших задач. Отменяйте в любое время.</p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch pb-24">
            {PRICING.map((p, i) => (
              <PricingCard key={i} p={p} i={i} user={user} onPurchase={handlePurchase} />
            ))}
          </div>
        </div>
        <Footer />
      </main>

      {selectedPlan && (
        <PaymentModal 
          isOpen={isPaymentOpen} 
          onClose={() => setIsPaymentOpen(false)} 
          selectedPlan={selectedPlan}
          isYearly={false}
        />
      )}
    </div>
  );
}
