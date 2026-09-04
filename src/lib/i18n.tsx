'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import pt from '../locales/pt.json';
import en from '../locales/en.json';

export type Locale = 'pt' | 'en';
export type Dictionary = typeof pt;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: Dictionary;
}

const dictionaries = {
  pt,
  en,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('pt');

  useEffect(() => {
    // Try to load from localStorage on mount
    const saved = localStorage.getItem('printFarm_locale') as Locale;
    if (saved && (saved === 'pt' || saved === 'en')) {
      setLocale(saved);
    } else {
      // Auto-detect browser language if none saved
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'en') {
        setLocale('en');
      }
    }
  }, []);

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('printFarm_locale', newLocale);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, dict: dictionaries[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useDictionary() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback for SSR or when used outside provider (though shouldn't happen)
    return { dict: dictionaries.pt, locale: 'pt', setLocale: () => {} };
  }
  return context;
}

// Keep the old function for backward compatibility in non-React files if needed
export function getDictionary(locale: keyof typeof dictionaries = 'pt') {
  return dictionaries[locale];
}
