'use client'

import { type NoteMeta } from '@/lib/note-types'

interface Props {
  notes: NoteMeta[]
  activeNoteId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onImportDraft?: () => void
}

export default function NotesPanel({ notes, activeNoteId, onSelect, onCreate, onImportDraft }: Props) {
  return (
    <aside className="notes-panel" aria-label="Local notes">
      <div className="panel-kicker">Notes</div>
      <button type="button" className="panel-action" onClick={onCreate}>
        New note
      </button>
      {onImportDraft && (
        <button type="button" className="panel-action subtle" onClick={onImportDraft}>
          Import current draft
        </button>
      )}
      <div className="panel-list">
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            className={note.id === activeNoteId ? 'panel-row active' : 'panel-row'}
            onClick={() => onSelect(note.id)}
          >
            <span>{note.title}</span>
            <time>{new Date(note.updated).toLocaleDateString()}</time>
          </button>
        ))}
      </div>
    </aside>
  )
}
