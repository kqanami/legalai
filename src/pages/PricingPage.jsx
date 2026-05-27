import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { FadeUp, TiltCard } from '../components/ui/animations';
import Header from '../components/Header';
import { Footer } from '../components/Footer';

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

function PricingCard({ p, i, user }) {
  return (
    <FadeUp delay={i * 0.1} className="relative md:col-span-1 h-full">
      <TiltCard className={p.popular ? "scale-105 z-10" : "z-0"}>
        <div className="flex flex-col h-full">
          <div className="mb-8">
            <span className="text-xs font-bold tracking-widest uppercase text-neutral-500 mb-2 block">{p.name}</span>
            <div className="flex items-baseline gap-1 mt-4">
              <span className="text-4xl font-bold text-white tracking-tight">{p.price}</span>
              <span className="text-lg font-medium text-neutral-500">{p.period ? `₸${p.period}` : ''}</span>
            </div>
            <p className="text-sm text-neutral-400 mt-4 h-10">{p.desc}</p>
          </div>

          <div className="flex-1 space-y-4 mb-10">
            {p.features.map((f, fi) => (
              <div key={fi} className="flex items-start gap-3">
                <Check size={18} className={p.popular ? 'text-white' : 'text-neutral-600'} />
                <span className="text-sm text-neutral-300 font-medium">{f}</span>
              </div>
            ))}
          </div>

        </div>
      </TiltCard>
    </FadeUp>
  );
}

export default function PricingPage({ user, t }) {
  return (
    <div className="min-h-screen bg-black overflow-hidden text-neutral-200 font-sans selection:bg-neutral-800 selection:text-white flex flex-col">
      <Header user={user} t={t} />
      
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-24 relative z-10">
        <div className="max-w-screen-xl w-full mx-auto px-6 sm:px-12">
          
          <FadeUp className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">Инвестиция в вашу <br/>эффективность.</h1>
            <p className="text-neutral-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">Выберите план, который лучше всего подходит для ваших задач. Отменяйте в любое время.</p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch max-w-screen-xl mx-auto">
            {PRICING.map((p, i) => (
              <PricingCard key={i} p={p} i={i} user={user} />
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
