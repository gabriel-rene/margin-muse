import MuseNote from '@/components/MuseNote'
import { type MuseNoteData } from '@/lib/types'

interface Props {
  notes: MuseNoteData[]
  onDismiss: (id: string) => void
  railRef?: React.Ref<HTMLElement>
}

export default function MarginRail({ notes, onDismiss, railRef }: Props) {
  return (
    <aside ref={railRef} className="margin-rail w-72 shrink-0 relative min-h-full">
      {notes.map((note) => (
        <MuseNote key={note.id} note={note} onDismiss={onDismiss} />
      ))}
    </aside>
  )
}
