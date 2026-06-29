'use client'

import { useState, useEffect } from 'react'
import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'
import PaperToneSwitch from '@/components/PaperToneSwitch'
import { PAPER_TONES, DEFAULT_TONE, type PaperTone } from '@/lib/paper'
import { type PersonaId } from '@/lib/personas'

export default function Home() {
  const [tone, setTone] = useState<PaperTone>(DEFAULT_TONE)

  useEffect(() => {
    const tokens = PAPER_TONES[tone]
    const root = document.documentElement
    for (const [key, val] of Object.entries(tokens)) {
      root.style.setProperty(key, val)
    }
  }, [tone])

  function handleMusePick(persona: PersonaId, selectedText: string, contextText: string) {
    // Wired in Task 6 — for now log to confirm wiring
    console.log('Muse pick:', persona, selectedText.slice(0, 40))
  }

  return (
    <main className="flex min-h-screen gap-8 px-8 py-12 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <Editor onMusePick={handleMusePick} />
      </div>
      <MarginRail />
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <PaperToneSwitch tone={tone} onChange={setTone} />
      </div>
    </main>
  )
}
