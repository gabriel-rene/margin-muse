'use client'

import { type NoteMeta } from '@/lib/note-types'

interface Props {
  notes: NoteMeta[]
  activeNoteId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onImportDraft?: () => void
}

export default function NotesPanel({ notes, activeNoteId, onSelect, onCreate, onDelete, onImportDraft }: Props) {
  return (
    <>
      <div className="sidebar-header">
        <span className="sidebar-heading">Notes</span>
        <button type="button" className="sidebar-create" onClick={onCreate} aria-label="New note">+</button>
      </div>
      <div className="sidebar-body">
        {onImportDraft && (
          <button type="button" className="sidebar-import" onClick={onImportDraft}>
            Import draft
          </button>
        )}
        <div className="sidebar-list">
          {notes.map((note) => (
            <div key={note.id} className={`sidebar-note${note.id === activeNoteId ? ' active' : ''}`}>
              <button
                type="button"
                className="sidebar-note-delete"
                onClick={(e) => { e.stopPropagation(); onDelete(note.id) }}
                aria-label={`Delete ${note.title}`}
              >
                −
              </button>
              <button type="button" className="sidebar-note-body" onClick={() => onSelect(note.id)}>
                <span className="sidebar-note-title">{note.title || 'Untitled'}</span>
                <time className="sidebar-note-date">{new Date(note.updated).toLocaleDateString()}</time>
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
