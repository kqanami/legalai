import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';
import { Spotlight } from '../components/ui/spotlight';
import { FadeUp } from '../components/ui/animations';
import CustomSelect from '../components/CustomSelect';
import { GoogleLogin } from '@react-oauth/google';

export default function AuthPage() {
  const { t } = useLanguage();
  const { loginEmail, registerEmail, googleAuth, isLoading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLawyer, setIsLawyer] = useState(false);
  const [iin, setIin] = useState('');
  const [license, setLicense] = useState('');
  const [specialization, setSpecialization] = useState('Гражданское право');
  const [error, setError] = useState('');

  const { registerLawyer } = useAuth();

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }
    try {
      let userData;
      if (mode === 'register') {
        if (!name) {
          setError('Заполните имя');
          return;
        }
        if (isLawyer) {
          if (!iin || !license) {
            setError('Заполните ИИН и номер лицензии');
            return;
          }
          userData = await registerLawyer({ name, email, password, iin, license_number: license, specialization });
        } else {
          userData = await registerEmail(name, email, password);
        }
      } else {
        userData = await loginEmail(email, password);
      }
      
      if (userData?.role === 'lawyer') {
        navigate('/lawyer');
      } else {
        navigate('/dashboard');
      }
    } catch (e) {
      setError(e.message || 'Ошибка авторизации');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const userData = await googleAuth(credentialResponse.credential);
      if (userData?.role === 'lawyer') {
        navigate('/lawyer');
      } else {
        navigate('/dashboard');
      }
    } catch (e) {
      setError(e.message || 'Ошибка авторизации через Google');
    }
  };

  const handleGoogleError = () => {
    setError('Ошибка авторизации через Google');
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden font-sans text-white py-12">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

      <FadeUp className="w-full max-w-md relative z-10" delay={0.1}>
        <div className="absolute top-8 left-8 flex items-center gap-2 pointer-events-none z-10">
          <span className="font-black text-xl tracking-tighter">LEGAL<span className="text-white/40">AI</span></span>
        </div>

        <div className="bg-[#050505]/80 backdrop-blur-3xl border border-white/5 p-8 lg:p-10 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <motion.div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          <div className="flex justify-center mb-8 relative z-10">
            <LanguageToggle />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              className="flex gap-1 bg-[#050505] rounded-2xl p-1 mb-8 relative z-10 border border-white/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {['login', 'register'].map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                    mode === m ? 'text-black' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {mode === m && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-white"
                      layoutId="auth-tab"
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    />
                  )}
                  <span className="relative z-10">{m === 'login' ? 'Вход' : 'Регистрация'}</span>
                </button>
              ))}
            </motion.div>
          </AnimatePresence>

          <form onSubmit={handleAuth} className="relative z-10">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="register_fields"
                  className="mb-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">{t('auth_name')}</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('auth_name_placeholder')} className="w-full px-4 h-14 rounded-2xl bg-white/[0.02] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors mb-4" />
                  
                  <div className="flex items-center gap-3 mb-4 bg-[#050505] p-4 rounded-2xl border border-white/5">
                    <input 
                      type="checkbox" 
                      id="isLawyer" 
                      checked={isLawyer} 
                      onChange={(e) => setIsLawyer(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-transparent text-white focus:ring-0"
                    />
                    <label htmlFor="isLawyer" className="text-[10px] font-black uppercase tracking-widest text-white/60 cursor-pointer">
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
                          <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">ИИН</label>
                          <input type="text" maxLength={12} value={iin} onChange={(e) => setIin(e.target.value.replace(/\D/g, ''))} placeholder="12 цифр" className="w-full px-4 h-12 rounded-xl bg-white/[0.02] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Номер лицензии</label>
                          <input type="text" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="Номер гос. лицензии" className="w-full px-4 h-12 rounded-xl bg-white/[0.02] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Специализация</label>
                          <CustomSelect 
                            value={specialization} 
                            onChange={(e) => setSpecialization(e.target.value)} 
                            options={['Гражданское право', 'Уголовное право', 'Корпоративное право', 'Налоговое право', 'Семейное право', 'Трудовое право']}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 h-14 rounded-2xl bg-white/[0.02] border border-white/10 text-sm tracking-wider font-bold text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors" />
            </div>

            <div className="mb-8">
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Пароль</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 h-14 rounded-2xl bg-white/[0.02] border border-white/10 text-lg tracking-wider font-bold text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors" />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-4 text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-colors bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.svg
                    className="w-4 h-4 text-black"
                    viewBox="0 0 24 24"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </motion.svg>
                  {t('common_loading')}
                </span>
              ) : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
            
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-white/10"></div>
              <span className="px-3 text-[10px] font-black uppercase tracking-widest text-white/40">ИЛИ</span>
              <div className="flex-1 border-t border-white/10"></div>
            </div>

            <div className="flex justify-center w-full [&>div]:w-full [&>div>div]:!w-full [&>div>div>div]:!w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                shape="pill"
                size="large"
                width="100%"
              />
            </div>
          </form>
        </div>

        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 text-center mt-8">{t('footer_disclaimer')}</p>
      </FadeUp>
    </div>
  );
}
