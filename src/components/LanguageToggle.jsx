import { motion } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageToggle() {
  const { lang, switchLanguage } = useLanguage();

  return (
    <div className="flex items-center bg-obsidian-800/60 rounded-xl border border-white/[0.06] p-1 backdrop-blur-md">
      {['kz', 'ru'].map((l) => (
        <button
          key={l}
          onClick={() => switchLanguage(l)}
          className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            lang === l ? 'text-obsidian-950' : 'text-steel-400 hover:text-white'
          }`}
        >
          {lang === l && (
            <motion.div
              className="absolute inset-0 rounded-lg chrome-gradient"
              layoutId="lang-toggle"
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            />
          )}
          <span className="relative z-10">{l === 'kz' ? 'Қаз' : 'Рус'}</span>
        </button>
      ))}
    </div>
  );
}
