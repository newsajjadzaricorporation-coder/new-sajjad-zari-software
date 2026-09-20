import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Language, translate, translateCategory } from '../utils/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultVal?: string) => string;
  tCat: (category: string) => string;
  isUrdu: boolean;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'nszc_language_v1';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ur' || saved === 'en') return saved;
    } catch {
      // fallback
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  }, [language, setLanguage]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
    }
  }, [language]);

  const t = useCallback(
    (key: string, defaultVal?: string) => {
      return translate(key, language, defaultVal);
    },
    [language]
  );

  const tCat = useCallback(
    (cat: string) => {
      return translateCategory(cat, language);
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        tCat,
        isUrdu: language === 'ur',
        dir: language === 'ur' ? 'rtl' : 'ltr',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
