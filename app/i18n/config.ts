export const locales = ['en', 'zh'];
export const defaultLocale = 'en';

// This function takes a URL pathname and returns it with the locale prefix
export function addLocalePrefix(pathname: string, locale = defaultLocale): string {
  // If pathname already starts with locale, return as is
  if (locales.some(loc => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`)) {
    return pathname;
  }
  
  // Add locale prefix
  return `/${locale}${pathname === '/' ? '' : pathname}`;
}

// This function returns a pathname without the locale prefix
export function removeLocalePrefix(pathname: string): string {
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return pathname.replace(`/${locale}`, '') || '/';
    }
  }
  return pathname;
}

// This function extracts the locale from a pathname
export function extractLocale(pathname: string): string | undefined {
  const segments = pathname.split('/');
  if (segments.length > 1 && locales.includes(segments[1])) {
    return segments[1];
  }
  return undefined;
} 