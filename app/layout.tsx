import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from './contexts/AuthContext'
import MainNavigation from './components/MainNavigation'
import { NextIntlClientProvider } from 'next-intl'
import { locales, defaultLocale } from './i18n/config'

export async function generateMetadata(
  { params }: { params: { locale?: string } }
): Promise<Metadata> {
  return {
    title: 'Bible Graph',
    description: 'Interactive visualization of Bible cross-references',
  }
}

interface RootLayoutProps {
  children: React.ReactNode
  params: { locale?: string }
}

export async function generateStaticParams() {
  return locales.map(locale => ({ locale }))
}

export default async function RootLayout({
  children,
  params: { locale = defaultLocale },
}: RootLayoutProps) {
  // Load messages directly
  let messages;
  try {
    messages = (await import(`./i18n/locales/${locale}.json`)).default;
  } catch (error) {
    console.error(`Could not load messages for locale "${locale}"`, error);
    // Fallback to default locale if messages for the specific locale couldn't be loaded
    messages = (await import(`./i18n/locales/${defaultLocale}.json`)).default;
  }

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-gray-50">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <MainNavigation />
              <main className="flex-grow">
                {children}
              </main>
              <footer className="bg-white border-t py-6">
                <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
                  <p>Bible Graph App &copy; {new Date().getFullYear()}</p>
                </div>
              </footer>
            </div>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
} 