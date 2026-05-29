import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CreditCard, Lock } from 'lucide-react';

const kaspiIcon = (
  <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" fill="#F14635"/>
    <path d="M40 30L60 50L40 70" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function PaymentModal({ isOpen, onClose, selectedPlan, isYearly }) {
  const [method, setMethod] = useState('kaspi');
  const [status, setStatus] = useState('idle'); // idle, processing, success
  
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  if (!isOpen || !selectedPlan) return null;

  const price = selectedPlan.price;
  const billingText = selectedPlan.period === '/мес' ? 'Списание раз в месяц' : 'Единоразовый платеж';

  const handlePayment = () => {
    setStatus('processing');
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 font-sans selection:bg-white/30">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#050505]/90 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-4xl bg-[#050505] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row z-10"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.02] border border-white/5 text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <X size={16} />
            </button>

            {/* Left side: Order Summary */}
            <div className="w-full md:w-5/12 bg-white/[0.02] p-10 border-r border-white/5 flex flex-col">
              <div className="mb-8">
                <span className="text-[10px] font-black tracking-widest uppercase text-white/40 mb-4 block">Оформление тарифа</span>
                <span className="text-xl font-black text-white tracking-widest uppercase">{selectedPlan.name}</span>
              </div>
              
              <div className="flex items-baseline gap-2 mb-2">
                <h2 className="text-5xl font-black text-white tracking-tighter">{price}</h2>
                <span className="text-sm font-black text-white/40 tracking-widest uppercase">₸</span>
              </div>
              <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-10">{billingText}</p>
              
              <div className="space-y-4 mb-8 flex-1">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Включено:</h3>
                {selectedPlan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={10} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-white/80">{feat}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto pt-8 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Итого</span>
                  <span className="text-xl font-black text-white tracking-tighter">{price} ₸</span>
                </div>
              </div>
            </div>

            {/* Right side: Payment Method */}
            <div className="w-full md:w-7/12 p-10 bg-[#050505] flex flex-col">
              {status === 'success' ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                    className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white mb-6"
                  >
                    <Check size={32} strokeWidth={3} />
                  </motion.div>
                  <h3 className="text-2xl font-black text-white mb-4 tracking-tighter">ОПЛАТА УСПЕШНА</h3>
                  <p className="text-xs text-white/60 font-bold uppercase tracking-widest">Тариф активирован. Идет перенаправление...</p>
                </div>
              ) : (
                <>
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-8">Способ оплаты</h3>
                  
                  {/* Method Selector */}
                  <div className="flex gap-4 mb-8">
                    <button 
                      onClick={() => setMethod('kaspi')}
                      className={`flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all ${method === 'kaspi' ? 'border-[#F14635]/50 bg-[#F14635]/5' : 'border-white/5 bg-white/[0.01] hover:border-white/20'}`}
                    >
                      {kaspiIcon}
                      <span className={`text-[10px] font-black tracking-widest uppercase ${method === 'kaspi' ? 'text-white' : 'text-white/40'}`}>Kaspi QR</span>
                    </button>
                    
                    <button 
                      onClick={() => setMethod('card')}
                      className={`flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all ${method === 'card' ? 'border-white/50 bg-white/5' : 'border-white/5 bg-white/[0.01] hover:border-white/20'}`}
                    >
                      <CreditCard size={24} className={method === 'card' ? 'text-white' : 'text-white/40'} />
                      <span className={`text-[10px] font-black tracking-widest uppercase ${method === 'card' ? 'text-white' : 'text-white/40'}`}>Карта</span>
                    </button>
                  </div>

                  {/* Payment Details Area */}
                  <div className="flex-1 bg-white/[0.01] rounded-2xl border border-white/5 p-8 flex flex-col items-center justify-center">
                    {method === 'kaspi' ? (
                      <div className="text-center w-full max-w-[200px] mx-auto">
                        <div className="bg-white p-4 rounded-xl mb-6 flex items-center justify-center aspect-square">
                          <div className="w-full h-full bg-[repeating-linear-gradient(45deg,#000_0,#000_10px,transparent_10px,transparent_20px),repeating-linear-gradient(-45deg,#000_0,#000_10px,transparent_10px,transparent_20px)] opacity-90" />
                        </div>
                        <p className="text-[10px] font-bold text-white/60 tracking-widest uppercase">Отсканируйте код в Kaspi.kz</p>
                      </div>
                    ) : (
                      <div className="w-full space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 block">Номер карты</label>
                          <input type="text" placeholder="0000 0000 0000 0000" className="w-full bg-[#050505] border border-white/10 rounded-xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/20" />
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 block">Срок</label>
                            <input type="text" placeholder="ММ/ГГ" className="w-full bg-[#050505] border border-white/10 rounded-xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/20" />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 block">CVC</label>
                            <input type="text" placeholder="123" className="w-full bg-[#050505] border border-white/10 rounded-xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/20" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 block">Владелец</label>
                          <input type="text" placeholder="ИМЯ ФАМИЛИЯ" className="w-full bg-[#050505] border border-white/10 rounded-xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/20" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex flex-col gap-4">
                    <button 
                      onClick={handlePayment}
                      disabled={status === 'processing'}
                      className={`w-full h-14 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-3 transition-all ${
                        status === 'processing' ? 'opacity-70 cursor-wait bg-white/10 text-white/50 border border-white/5' : 'bg-white text-black hover:bg-neutral-200'
                      }`}
                    >
                      {status === 'processing' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          Обработка...
                        </>
                      ) : (
                        `Оплатить ${price} ₸`
                      )}
                    </button>
                    <p className="text-center text-[9px] font-bold tracking-widest uppercase text-white/30 flex items-center justify-center gap-2">
                      <Lock size={10} /> Безопасная транзакция
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
