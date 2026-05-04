import { createContext, useContext, useState, useCallback } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('app_lang') || 'ru';
  });

  const switchLanguage = useCallback((newLang) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] || translations['ru']?.[key] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
