'use client'

import WebcamFeed from '@/components/WebcamFeed'

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Facial Recognition Demo</h1>
      <WebcamFeed />
    </main>
  )
}
