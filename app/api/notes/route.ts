import { NextResponse } from 'next/server'
import { createNote, getVaultRoot, listNotes } from '@/lib/vault'
import { EMPTY_TIPTAP_DOC, type CreateNoteInput } from '@/lib/note-types'

export const runtime = 'nodejs'

function isCreateNoteInput(value: unknown): value is CreateNoteInput {
  if (!value || typeof value !== 'object') return true
  const body = value as Record<string, unknown>
  return (
    (body.title === undefined || typeof body.title === 'string') &&
    (body.content === undefined || (typeof body.content === 'object' && body.content !== null))
  )
}

export async function GET() {
  const notes = await listNotes(getVaultRoot())
  return NextResponse.json({ notes })
}

export async function POST(req: Request) {
  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  if (!isCreateNoteInput(body)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const input = body as CreateNoteInput
  const note = await createNote(getVaultRoot(), {
    title: input.title,
    content: input.content ?? EMPTY_TIPTAP_DOC,
  })
  return NextResponse.json(note)
}
