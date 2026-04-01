import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Enerji Yönetim Sistemi',
  description: 'Energy Management & Decision Support System — Real-time monitoring, anomaly detection, and AI-driven forecasting.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
