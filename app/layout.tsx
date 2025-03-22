import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bible Graph',
  description: 'Interactive visualization of Bible cross-references',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
} 