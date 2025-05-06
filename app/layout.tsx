import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ProviderWrapper } from '@/components/ProviderWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Facial Recognition Demo',
  description: 'Face detection using face-api.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 text-zinc-50`} data-theme="dark">
        <ProviderWrapper>
          {children}
        </ProviderWrapper>
      </body>
    </html>
  )
}
