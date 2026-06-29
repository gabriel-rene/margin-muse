'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'
import PaperToneSwitch from '@/components/PaperToneSwitch'
import SoundToggle from '@/components/SoundToggle'
import { PAPER_TONES, DEFAULT_TONE, type PaperTone } from '@/lib/paper'
import { type PersonaId } from '@/lib/personas'
import { callMuse } from '@/lib/muse-client'
import { type MuseNoteData } from '@/lib/types'
import { initAudio, playMuseArrivalSound } from '@/lib/sound'

export default function Home() {
  const [tone, setTone] = useState<PaperTone>(DEFAULT_TONE)
  const [notes, setNotes] = useState<MuseNoteData[]>([])
  const [loading, setLoading] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const marginRailRef = useRef<HTMLElement>(null)
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const tokens = PAPER_TONES[tone]
    const root = document.documentElement
    for (const [key, val] of Object.entries(tokens)) {
      root.style.setProperty(key, val)
    }
  }, [tone])

  function handleSoundChange(v: boolean) {
    setSoundEnabled(v)
    if (v && !audioRef.current) {
      audioRef.current = initAudio()
    }
  }

  const handleMusePick = useCallback(
    async (persona: PersonaId, selectedText: string, contextText: string, anchorViewportTop: number) => {
      if (loading) return
      setLoading(true)
      // Convert viewport-relative top to rail-relative offset at pull time.
      // The editor column and margin rail are siblings in the same document flow
      // and scroll together, so this offset remains valid after scrolling.
      const railTop = marginRailRef.current?.getBoundingClientRect().top ?? 0
      const anchorTop = Math.max(0, anchorViewportTop - railTop)
      try {
        const result = await callMuse({ text: selectedText, persona, context: contextText })
        if (result.question) {
          setNotes((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              persona,
              question: result.question!,
              anchorTop,
              createdAt: Date.now(),
            },
          ])
          if (soundEnabled && audioRef.current) {
            playMuseArrivalSound(audioRef.current)
          }
        }
      } finally {
        setLoading(false)
      }
    },
    [loading, soundEnabled]
  )

  function dismissNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <main className="flex min-h-screen gap-8 px-8 py-12 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <Editor
          onMusePick={handleMusePick}
          loading={loading}
          soundEnabled={soundEnabled}
          audioCtx={audioRef.current}
        />
      </div>
      <MarginRail notes={notes} onDismiss={dismissNote} railRef={marginRailRef} />
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <PaperToneSwitch tone={tone} onChange={setTone} />
        <SoundToggle enabled={soundEnabled} onChange={handleSoundChange} />
      </div>
    </main>
  )
}
