import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CreditCard, ShieldCheck, Zap, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const kaspiIcon = (
  <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" fill="#F14635"/>
    <path d="M40 30L60 50L40 70" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function PaymentModal({ isOpen, onClose, selectedPlan, isYearly }) {
  const { user } = useAuth();
  const [method, setMethod] = useState('kaspi');
  const [status, setStatus] = useState('idle'); // idle, processing, success
  
  // Auto-close on success
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

  const price = isYearly ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice;
  const billingText = isYearly ? 'списание раз в год' : 'списание раз в месяц';

  const handlePayment = () => {
    setStatus('processing');
    // Mock processing delay
    setTimeout(() => {
      setStatus('success');
      // Here we would actually update the user's plan in DB/Context
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-obsidian-950/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-4xl bg-obsidian-900 border border-obsidian-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-steel-400 hover:text-white hover:bg-black/40 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Left side: Order Summary */}
            <div className="w-full md:w-5/12 bg-obsidian-950 p-8 border-r border-obsidian-800 flex flex-col">
              <div className="flex items-center gap-3 mb-6 text-chrome-300">
                {selectedPlan.icon}
                <span className="text-sm font-bold tracking-widest uppercase">{selectedPlan.name}</span>
              </div>
              
              <h2 className="text-3xl font-extrabold text-white mb-2">{price} ₸</h2>
              <p className="text-xs text-steel-500 font-medium mb-8">{billingText}</p>
              
              <div className="space-y-4 mb-8 flex-1">
                <h3 className="text-xs font-bold text-steel-400 uppercase tracking-wider mb-2">Включено в подписку:</h3>
                {selectedPlan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-steel-300">{feat}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto pt-6 border-t border-obsidian-800">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-steel-400">Итого к оплате</span>
                  <span className="text-white font-bold">{price} ₸</span>
                </div>
                {isYearly && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400/80">Экономия (20%)</span>
                    <span className="text-emerald-400 font-medium">применена</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Payment Method */}
            <div className="w-full md:w-7/12 p-8 bg-obsidian-900/50 flex flex-col">
              {status === 'success' ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                    className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-6 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                  >
                    <Check size={40} strokeWidth={3} />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-2">Оплата успешна!</h3>
                  <p className="text-steel-400">Тариф {selectedPlan.name} активирован. Перенаправляем...</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-white mb-6">Выберите способ оплаты</h3>
                  
                  {/* Method Selector */}
                  <div className="flex gap-4 mb-8">
                    <button 
                      onClick={() => setMethod('kaspi')}
                      className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${method === 'kaspi' ? 'border-[#F14635] bg-[#F14635]/5 shadow-[0_0_20px_rgba(241,70,53,0.1)]' : 'border-obsidian-700 hover:border-obsidian-600'}`}
                    >
                      {kaspiIcon}
                      <span className={`text-sm font-bold ${method === 'kaspi' ? 'text-white' : 'text-steel-400'}`}>Kaspi QR</span>
                    </button>
                    
                    <button 
                      onClick={() => setMethod('card')}
                      className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${method === 'card' ? 'border-chrome-500 bg-chrome-500/5 shadow-[0_0_20px_rgba(139,92,246,0.1)]' : 'border-obsidian-700 hover:border-obsidian-600'}`}
                    >
                      <CreditCard size={28} className={method === 'card' ? 'text-chrome-400' : 'text-steel-500'} />
                      <span className={`text-sm font-bold ${method === 'card' ? 'text-white' : 'text-steel-400'}`}>Банковская карта</span>
                    </button>
                  </div>

                  {/* Payment Details Area */}
                  <div className="flex-1 bg-obsidian-950/50 rounded-2xl border border-obsidian-800 p-6 flex flex-col items-center justify-center">
                    {method === 'kaspi' ? (
                      <div className="text-center w-full max-w-[200px] mx-auto">
                        <div className="bg-white p-4 rounded-2xl mb-4 shadow-lg flex items-center justify-center aspect-square">
                          {/* Fake QR code using CSS pattern */}
                          <div className="w-full h-full bg-[repeating-linear-gradient(45deg,#000_0,#000_10px,transparent_10px,transparent_20px),repeating-linear-gradient(-45deg,#000_0,#000_10px,transparent_10px,transparent_20px)] opacity-80" />
                        </div>
                        <p className="text-sm text-steel-400">Отсканируйте код в приложении Kaspi.kz</p>
                      </div>
                    ) : (
                      <div className="w-full space-y-4">
                        <div>
                          <label className="text-xs text-steel-500 mb-1 block">Номер карты</label>
                          <input type="text" placeholder="0000 0000 0000 0000" className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-chrome-500 transition-colors" />
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-xs text-steel-500 mb-1 block">Срок действия</label>
                            <input type="text" placeholder="ММ/ГГ" className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-chrome-500 transition-colors" />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-steel-500 mb-1 block">CVC</label>
                            <input type="text" placeholder="123" className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-chrome-500 transition-colors" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-steel-500 mb-1 block">Имя владельца</label>
                          <input type="text" placeholder="IVAN IVANOV" className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-chrome-500 transition-colors" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <button 
                      onClick={handlePayment}
                      disabled={status === 'processing'}
                      className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        method === 'kaspi' 
                          ? 'bg-[#F14635] hover:bg-[#d63b2a] text-white shadow-[0_0_20px_rgba(241,70,53,0.3)]' 
                          : 'chrome-gradient text-obsidian-950 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                      } ${status === 'processing' ? 'opacity-70 cursor-wait' : ''}`}
                    >
                      {status === 'processing' ? (
                        <>
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Обработка...
                        </>
                      ) : (
                        `Оплатить ${price} ₸`
                      )}
                    </button>
                    <p className="text-center text-[10px] text-steel-500 flex items-center justify-center gap-1.5">
                      <Lock size={10} /> Безопасная транзакция (PCI DSS Compliant)
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
