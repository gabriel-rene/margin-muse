import { type MuseNoteData } from '@/lib/types'

const PERSONA_LABELS: Record<string, string> = {
  skeptic: 'Skeptic',
  reader: 'Reader',
  cd: 'Director',
}

interface Props {
  note: MuseNoteData
  onDismiss: (id: string) => void
}

export default function MuseNote({ note, onDismiss }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: note.anchorTop,
        fontFamily: 'var(--font-muse)',
        color: 'var(--paper-muse-ink)',
      }}
      className="w-64 text-xs leading-relaxed border-l-2 pl-3 py-1 group"
    >
      <div className="uppercase tracking-widest text-[10px] opacity-50 mb-1">
        {PERSONA_LABELS[note.persona]}
      </div>
      <p className="italic">{note.question}</p>
      <button
        onClick={() => onDismiss(note.id)}
        className="mt-1 opacity-0 group-hover:opacity-40 hover:!opacity-70 text-[10px] transition-opacity"
      >
        dismiss
      </button>
    </div>
  )
}
