'use client'

import { useState, useEffect } from 'react'
import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'
import PaperToneSwitch from '@/components/PaperToneSwitch'
import { PAPER_TONES, DEFAULT_TONE, type PaperTone } from '@/lib/paper'

export default function Home() {
  const [tone, setTone] = useState<PaperTone>(DEFAULT_TONE)

  useEffect(() => {
    const tokens = PAPER_TONES[tone]
    const root = document.documentElement
    for (const [key, val] of Object.entries(tokens)) {
      root.style.setProperty(key, val)
    }
  }, [tone])

  return (
    <main className="flex min-h-screen gap-8 px-8 py-12 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <Editor />
      </div>
      <MarginRail />
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <PaperToneSwitch tone={tone} onChange={setTone} />
      </div>
    </main>
  )
}
