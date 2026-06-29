import { type Ref } from 'react'
import MuseNote from '@/components/MuseNote'
import { type MuseNoteData } from '@/lib/types'

interface Props {
  notes: MuseNoteData[]
  onDismiss: (id: string) => void
  railRef?: Ref<HTMLElement>
  onClearAll?: () => void
}

export default function MarginRail({ notes, onDismiss, railRef, onClearAll }: Props) {
  return (
    <aside ref={railRef} className="margin-rail w-72 shrink-0 relative min-h-full">
      {onClearAll && (
        <div
          className="sticky top-4 flex justify-end mb-2"
          style={{ fontFamily: 'var(--font-muse)' }}
        >
          <button
            onClick={onClearAll}
            className="text-xs opacity-30 hover:opacity-60 transition-opacity"
            style={{ color: 'var(--paper-muse-ink)' }}
          >
            clear all
          </button>
        </div>
      )}
      {notes.map((note) => (
        <MuseNote key={note.id} note={note} onDismiss={onDismiss} />
      ))}
    </aside>
  )
}
