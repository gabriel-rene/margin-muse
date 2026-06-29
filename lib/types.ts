import { type PersonaId } from '@/lib/personas'

export interface MuseNoteData {
  id: string
  persona: PersonaId
  question: string
  anchorTop: number
  createdAt: number
}
