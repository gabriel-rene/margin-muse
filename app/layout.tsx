import type { Metadata, Viewport } from 'next'
import { EB_Garamond, Inter } from 'next/font/google'
import './globals.css'

const garamond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-prose',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-muse',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Margin Muse',
  description: 'A writing editor where AI augments thinking.',
  appleWebApp: {
    capable: true,
    title: 'Margin Muse',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#f0ead8',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
