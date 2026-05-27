import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import { FadeUp, TiltCard } from '../components/ui/animations';
import Header from '../components/Header';
import { Footer } from '../components/Footer';
import PaymentModal from '../components/PaymentModal';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

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
    <FadeUp delay={i * 0.1} className="relative md:col-span-1 h-full">
      <TiltCard className={p.popular ? "scale-105 z-10" : "z-0"}>
        <div className={`flex flex-col h-full rounded-2xl relative ${isCurrentPlan ? 'ring-2 ring-emerald-500 bg-emerald-500/5' : ''}`}>
          {isCurrentPlan && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] z-20">
              Текущий тариф
            </div>
          )}
          
          <div className={`mb-8 ${isCurrentPlan ? 'p-6 pb-0' : ''}`}>
            <span className="text-xs font-bold tracking-widest uppercase text-neutral-500 mb-2 block">{p.name}</span>
            <div className="flex items-baseline gap-1 mt-4">
              <span className="text-4xl font-bold text-white tracking-tight">{p.price}</span>
              <span className="text-lg font-medium text-neutral-500">{p.period ? `₸${p.period}` : ''}</span>
            </div>
            <p className="text-sm text-neutral-400 mt-4 h-10">{p.desc}</p>
          </div>

          <div className={`flex-1 space-y-4 mb-10 ${isCurrentPlan ? 'px-6' : ''}`}>
            {p.features.map((f, fi) => (
               <div key={fi} className="flex items-start gap-3">
                 <Check size={18} className={p.popular || isCurrentPlan ? 'text-emerald-400' : 'text-neutral-600'} />
                 <span className="text-sm text-neutral-300 font-medium">{f}</span>
               </div>
            ))}
          </div>

          <div className={isCurrentPlan ? 'px-6 pb-6' : ''}>
            {user ? (
              <button
                onClick={() => !isCurrentPlan && onPurchase(p)}
                disabled={isCurrentPlan}
                className={`w-full py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 ${
                  isCurrentPlan
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : p.popular 
                      ? 'bg-white text-black hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]' 
                      : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {isCurrentPlan ? 'Ваш тариф' : 'Купить'}
              </button>
            ) : (
              <Link 
                to="/auth" 
                className={`block text-center w-full py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 ${
                  p.popular 
                    ? 'bg-white text-black hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]' 
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {p.cta}
              </Link>
            )}
          </div>
        </div>
      </TiltCard>
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
    <div className="min-h-screen overflow-hidden text-neutral-200 font-sans selection:bg-neutral-800 selection:text-white flex flex-col">
      {user ? (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 sm:p-6 flex items-center pointer-events-none">
          <button 
            onClick={() => navigate('/dashboard')}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-obsidian-900/80 backdrop-blur-xl border border-white/[0.08] hover:bg-white/10 rounded-xl text-sm font-bold text-white transition-all shadow-2xl group"
          >
            <ArrowLeft size={16} className="text-white/50 group-hover:text-white transition-colors" />
            В дашборд
          </button>
        </div>
      ) : (
        <Header user={user} t={t} />
      )}
      
      <main className={`flex-1 flex flex-col items-center justify-center ${user ? 'pt-24' : 'pt-32'} pb-24 relative z-10`}>
        <div className="max-w-screen-xl w-full mx-auto px-6 sm:px-12">
          
          <FadeUp className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">Инвестиция в вашу <br/>эффективность.</h1>
            <p className="text-neutral-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">Выберите план, который лучше всего подходит для ваших задач. Отменяйте в любое время.</p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch max-w-screen-xl mx-auto">
            {PRICING.map((p, i) => (
              <PricingCard key={i} p={p} i={i} user={user} onPurchase={handlePurchase} />
            ))}
          </div>

        </div>
      </main>

      <Footer />

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
