import type { Metadata } from 'next'
import '../globals.css'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

type Props = {
  children: React.ReactNode
  params: { locale: string }
}

export const metadata: Metadata = {
  title: 'Bible Graph',
  description: 'Interactive visualization of Bible cross-references',
}

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'zh' }]
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  const messages = await getMessages({ locale })

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
} 