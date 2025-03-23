import { useRouter } from 'next/router';

type Translations = {
  [locale: string]: {
    [key: string]: any
  }
};

// Load all translation files
const translations: Translations = {
  en: require('../i18n/locales/en.json'),
  zh: require('../i18n/locales/zh.json')
};

/**
 * Get a translated string by key using dot notation (e.g., 'auth.login')
 */
export function getTranslation(locale: string, key: string, defaultValue: string = ''): string {
  const keys = key.split('.');
  let value: any = translations[locale] || translations['en']; // Fallback to English
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) return defaultValue;
  }
  
  return typeof value === 'string' ? value : defaultValue;
}

/**
 * Hook to get the current locale and translation functions
 */
export function useTranslation() {
  const router = useRouter();
  const { locale = 'en', locales = ['en'] } = router;
  
  const t = (key: string, defaultValue: string = ''): string => {
    return getTranslation(locale, key, defaultValue);
  };
  
  return {
    locale,
    locales,
    t,
    changeLanguage: (newLocale: string) => {
      const { pathname, asPath, query } = router;
      router.push({ pathname, query }, asPath, { locale: newLocale });
    }
  };
} 