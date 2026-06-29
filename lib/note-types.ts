import { type MuseNoteData } from '@/lib/types'

export type TiptapMark = {
  type: 'bold' | 'italic' | 'link' | string
  attrs?: Record<string, unknown>
}

export type TiptapNode = {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: TiptapMark[]
  content?: TiptapNode[]
}

export type TiptapDoc = {
  type: 'doc'
  content?: TiptapNode[]
}

export interface NoteMeta {
  id: string
  title: string
  slug: string
  filename: string
  created: string
  updated: string
}

export interface NoteRecord extends NoteMeta {
  markdown: string
  content: TiptapDoc
  museNotes: MuseNoteData[]
}

export interface VersionMeta {
  id: string
  noteId: string
  filename: string
  created: string
  title: string
}

export interface SaveNoteInput {
  title: string
  content: TiptapDoc
  museNotes?: MuseNoteData[]
}

export interface CreateNoteInput {
  title?: string
  content?: TiptapDoc
}

export const EMPTY_TIPTAP_DOC: TiptapDoc = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}
