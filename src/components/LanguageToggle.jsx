import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageToggle() {
  const { lang, switchLanguage } = useLanguage();

  return (
    <div className="flex items-center bg-white/[0.02] rounded-lg border border-white/5 backdrop-blur-md p-1">
      {['kz', 'ru'].map((l) => (
        <button
          key={l}
          onClick={() => switchLanguage(l)}
          className={`relative px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${
            lang === l 
              ? 'bg-white text-black' 
              : 'text-white/40 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          {l === 'kz' ? 'KZ' : 'RU'}
        </button>
      ))}
    </div>
  );
}
