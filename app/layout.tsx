import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'PriceHunt AU — Baby Product Price Comparison',
  description:
    'Compare baby product prices across Woolworths, Coles, Aldi, Amazon AU and Chemist Warehouse with unit-price normalisation.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={dmSans.variable} style={{ margin: 0, fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
