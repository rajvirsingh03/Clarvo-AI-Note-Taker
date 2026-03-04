import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  title: {
    default: 'Clarvo AI — Learn Smarter from Any Video',
    template: '%s | Clarvo AI',
  },
  description:
    'Clarvo AI turns any online video into structured notes, flashcards, and action plans — automatically.',
  openGraph: {
    title: 'Clarvo AI',
    description: 'Learn smarter from any video.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${syne.variable} ${dmSans.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  )
}
