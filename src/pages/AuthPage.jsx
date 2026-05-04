import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Scale, ShieldCheck } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';
import KineticBackground from '../components/KineticBackground';
import MagneticButton from '../components/MagneticButton';

export default function AuthPage() {
  const { t } = useLanguage();
  const { login, register, registerLawyer, isLoading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isLawyer, setIsLawyer] = useState(false);
  const [iin, setIin] = useState('');
  const [license, setLicense] = useState('');
  const [specialization, setSpecialization] = useState('Гражданское право');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const handleSendCode = (e) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError('Введите корректный номер телефона');
      return;
    }
    setError('');
    setMode('otp');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError('Введите код подтверждения');
      return;
    }
    try {
      let userData;
      if (isLawyer && name) {
        if (!iin || !license) {
          setError('Заполните ИИН и номер лицензии');
          return;
        }
        userData = await registerLawyer({ name, phone, code: otp, iin, license_number: license, specialization });
      } else if (name) {
        userData = await register(name, phone, otp);
      } else {
        userData = await login(phone, otp);
      }
      
      if (userData?.role === 'lawyer') {
        navigate('/lawyer');
      } else {
        navigate('/dashboard');
      }
    } catch (e) {
      setError('Неверный код или ошибка регистрации');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* 3D Kinetic background */}
      <div className="fixed inset-0 z-0">
        <KineticBackground variant="landing" />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <motion.div
            className="w-16 h-16 rounded-2xl chrome-gradient flex items-center justify-center shadow-2xl shadow-chrome-500/20 box-border border-t-2 border-l-2 border-white/40"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Scale className="text-obsidian-950" size={32} strokeWidth={2.5} />
          </motion.div>
        </Link>

        <motion.div
          className="glass-card p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-3xl border-t border-chrome-600/30 border-l border-chrome-600/20"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Animated cold glow */}
          <motion.div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1), transparent)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          {/* Language toggle */}
          <div className="flex justify-center mb-6 relative z-10">
            <LanguageToggle />
          </div>

          {/* Tabs */}
          <AnimatePresence mode="wait">
            {mode !== 'otp' && (
              <motion.div
                className="flex gap-1 bg-obsidian-800/80 rounded-xl p-1 mb-8 relative z-10 border border-obsidian-600/50 shadow-inner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {['login', 'register'].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(''); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                      mode === m ? 'text-obsidian-950 text-shadow-none' : 'text-steel-400 hover:text-white'
                    }`}
                  >
                    {mode === m && (
                      <motion.div
                        className="absolute inset-0 rounded-lg chrome-gradient"
                        layoutId="auth-tab"
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      />
                    )}
                    <span className="relative z-10">{t(m === 'login' ? 'auth_login' : 'auth_register')}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={mode === 'otp' ? handleVerify : handleSendCode} className="relative z-10">
            <AnimatePresence mode="wait">
              {/* Name (register only) */}
              {mode === 'register' && (
                <motion.div
                  key="register_fields"
                  className="mb-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-sm text-steel-400 mb-2 font-medium">{t('auth_name')}</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('auth_name_placeholder')} className="input-field shadow-inner mb-4" />
                  
                  <div className="flex items-center gap-3 mb-4 bg-obsidian-800/50 p-3 rounded-xl border border-obsidian-600/50">
                    <input 
                      type="checkbox" 
                      id="isLawyer" 
                      checked={isLawyer} 
                      onChange={(e) => setIsLawyer(e.target.checked)}
                      className="w-4 h-4 rounded border-obsidian-600 text-chrome-500 focus:ring-chrome-500 bg-obsidian-900"
                    />
                    <label htmlFor="isLawyer" className="text-sm text-steel-300 font-medium cursor-pointer">
                      Я юрист (создать профиль специалиста)
                    </label>
                  </div>

                  <AnimatePresence>
                    {isLawyer && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 mb-4"
                      >
                        <div>
                          <label className="block text-xs text-steel-400 mb-1">ИИН</label>
                          <input type="text" maxLength={12} value={iin} onChange={(e) => setIin(e.target.value.replace(/\D/g, ''))} placeholder="12 цифр" className="input-field text-sm py-2 shadow-inner" />
                        </div>
                        <div>
                          <label className="block text-xs text-steel-400 mb-1">Номер лицензии</label>
                          <input type="text" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="Номер гос. лицензии" className="input-field text-sm py-2 shadow-inner" />
                        </div>
                        <div>
                          <label className="block text-xs text-steel-400 mb-1">Специализация</label>
                          <select value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="input-field text-sm py-2 shadow-inner appearance-none">
                            <option>Гражданское право</option>
                            <option>Уголовное право</option>
                            <option>Корпоративное право</option>
                            <option>Налоговое право</option>
                            <option>Семейное право</option>
                            <option>Трудовое право</option>
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Phone */}
              {mode !== 'otp' && (
                <motion.div key="phone" className="mb-4" layout>
                  <label className="block text-sm text-steel-400 mb-2 font-medium">{t('auth_phone')}</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('auth_phone_placeholder')} className="input-field text-lg tracking-wider font-medium shadow-inner" />
                </motion.div>
              )}

              {/* OTP */}
              {mode === 'otp' && (
                <motion.div
                  key="otp"
                  className="mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="text-center mb-8 mt-2">
                    <motion.div
                      className="mb-4 text-chrome-400 flex justify-center"
                      animate={{ y: [0, -5, 0], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <ShieldCheck size={48} strokeWidth={1.5} />
                    </motion.div>
                    <p className="text-sm text-steel-400">Код отправлен на номер</p>
                    <p className="text-white font-semibold tracking-wider mt-1">{phone}</p>
                  </div>
                  <label className="block text-sm text-center text-steel-400 mb-4">{t('auth_otp')}</label>
                  <div className="flex gap-2 justify-center mb-6">
                    {[...Array(6)].map((_, i) => (
                      <motion.input
                        key={i}
                        type="text"
                        maxLength={1}
                        value={otp[i] || ''}
                        onChange={(e) => {
                          const newOtp = otp.split('');
                          newOtp[i] = e.target.value;
                          setOtp(newOtp.join(''));
                          if (e.target.value && e.target.nextSibling) e.target.nextSibling.focus();
                        }}
                        className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-obsidian-800/80 border-b-2 border-r border-obsidian-600/50 text-white outline-none transition-all duration-300 focus:border-chrome-400 focus:bg-obsidian-700/80 focus:shadow-[0_0_20px_rgba(255,255,255,0.1)] shadow-inner"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileFocus={{ scale: 1.05 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="text-red-400/90 text-sm mb-4 text-center bg-red-900/10 py-2 rounded-lg border border-red-900/30"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <MagneticButton
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 text-base tracking-wide font-bold shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
              strength={0.2}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.svg
                    className="w-5 h-5 text-obsidian-900"
                    viewBox="0 0 24 24"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </motion.svg>
                  {t('common_loading')}
                </span>
              ) : mode === 'otp' ? t('auth_verify') : t('auth_send_code')}
            </MagneticButton>

            {mode === 'otp' && (
              <button type="button" onClick={() => setMode('login')} className="w-full mt-4 text-sm text-steel-500 hover:text-white transition-colors">
                ← Изменить номер
              </button>
            )}
          </form>
        </motion.div>

        <p className="text-xs text-steel-600 text-center mt-8 tracking-wide font-medium">{t('footer_disclaimer')}</p>
      </motion.div>
    </div>
  );
}
