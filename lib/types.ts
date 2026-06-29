import { type PersonaId } from '@/lib/personas'

export interface MuseNoteData {
  id: string
  persona: PersonaId
  question: string
  /**
   * Vertical offset (px) of the note within the margin rail, captured at pull
   * time as `selectionViewportTop - railViewportTop`.
   *
   * KNOWN v1 LIMITATION: this is a frozen pixel value. It is never recomputed,
   * so the note drifts out of alignment with its source passage once the writer
   * edits earlier prose, reloads at a different viewport width, or changes a
   * paper tone that shifts line-height. v1 accepts this; the roadmap defers
   * edit-resilient anchoring (offsets that shift with the document) to a later
   * version. The proper fix is to anchor to a ProseMirror position and map it
   * through edits via a Tiptap decoration — the Tiptap foundation was chosen
   * precisely to make that possible. Carry into v1.5.
   */
  anchorTop: number
  createdAt: number
}
