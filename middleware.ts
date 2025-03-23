import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'zh'],

  // The default locale to use when visiting a non-localized route
  defaultLocale: 'en',
  
  // Localized paths
  localePrefix: 'always'
});

export const config = {
  // Match all pathnames except for:
  // - /api routes (API routes should never have a locale prefix)
  // - /_next (Next.js internals)
  // - /images (public files)
  // - /_vercel (Vercel internals)
  // - all root files inside /public (e.g. /favicon.ico)
  matcher: ['/((?!api|_next|_vercel|images|.*\\..*).*)']
}; 