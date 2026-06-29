'use client'

import { useEffect, useRef } from 'react'
import { type PersonaId } from '@/lib/personas'

interface Props {
  anchorRect: DOMRect
  onPick: (persona: PersonaId) => void
  onClose: () => void
}

const PERSONAS: { id: PersonaId; label: string; hint: string }[] = [
  { id: 'skeptic', label: 'Skeptic', hint: 'Tests your claims' },
  { id: 'reader', label: 'Reader', hint: 'Represents your audience' },
  { id: 'cd', label: 'Director', hint: 'The agency lens' },
]

export default function MusePicker({ anchorRect, onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // anchorRect comes from getBoundingClientRect(), which is viewport-relative.
  // Position the picker with `fixed` so those coordinates map directly to the
  // viewport — independent of where the editor container sits on the page and
  // of scroll offset. Using `absolute` here would place it relative to the
  // nearest positioned ancestor (.editor-wrap), misaligning it by that offset.
  const top = anchorRect.bottom + 6
  const left = anchorRect.left

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top,
        left,
        fontFamily: 'var(--font-muse)',
        zIndex: 50,
      }}
      className="flex gap-1 bg-[var(--paper-bg)] border border-[var(--paper-ink)] border-opacity-20 rounded-lg shadow-sm p-1"
    >
      {PERSONAS.map(({ id, label, hint }) => (
        <button
          key={id}
          title={hint}
          onClick={() => onPick(id)}
          className="px-3 py-1 text-xs rounded-md hover:bg-black hover:bg-opacity-5 transition-colors"
          style={{ color: 'var(--paper-muse-ink)' }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
