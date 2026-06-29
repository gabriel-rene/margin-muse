import { type MuseNoteData } from '@/lib/types'

const DOC_KEY = 'muse:document'
const NOTES_KEY = 'muse:notes'

export function saveDocument(content: string): void {
  try {
    localStorage.setItem(DOC_KEY, content)
  } catch {}
}

export function loadDocument(): string | null {
  try {
    return localStorage.getItem(DOC_KEY)
  } catch {
    return null
  }
}

export function saveNotes(notes: MuseNoteData[]): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
  } catch {}
}

export function loadNotes(): MuseNoteData[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MuseNoteData[]
  } catch {
    return []
  }
}
