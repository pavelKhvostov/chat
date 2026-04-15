import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'IntraChat',
  description: 'Корпоративный мессенджер',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`${inter.variable}`}>
      <body className="bg-[#0f0f1a] text-white antialiased">
        {children}
      </body>
    </html>
  )
}
