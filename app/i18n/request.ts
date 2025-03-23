import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './config';

export default getRequestConfig(async ({ locale }) => {
  // Default to the default locale if locale is undefined
  const localeToUse = locale || defaultLocale;
  
  // Validate requested locale
  if (!locales.includes(localeToUse)) {
    return {
      locale: defaultLocale,
      messages: (await import(`./locales/${defaultLocale}.json`)).default
    };
  }
  
  return {
    locale: localeToUse,
    messages: (await import(`./locales/${localeToUse}.json`)).default
  };
}); 