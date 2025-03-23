import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  // Default to 'en' if locale is undefined
  const localeToUse = locale || 'en';
  
  return {
    locale: localeToUse,
    messages: (await import(`./locales/${localeToUse}.json`)).default
  };
}); 