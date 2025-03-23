import { useRouter, usePathname } from 'next/navigation';
import { locales } from './config';

// We'll create simple navigation functions
export function createLocalizedPathnameGetter(locale: string) {
  return function getLocalizedPathname(pathname: string) {
    // If the pathname already has a locale prefix, replace it
    for (const loc of locales) {
      if (pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`) {
        return pathname.replace(`/${loc}`, `/${locale}`);
      }
    }
    
    // Otherwise, add the locale prefix
    return `/${locale}${pathname === '/' ? '' : pathname}`;
  };
} 