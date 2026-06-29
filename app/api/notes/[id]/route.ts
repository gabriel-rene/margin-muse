import { NextResponse } from 'next/server'
import { deleteNote, getVaultRoot, readNote, saveNote } from '@/lib/vault'
import { type SaveNoteInput } from '@/lib/note-types'

export const runtime = 'nodejs'

interface Params {
  params: { id: string }
}

function isSaveNoteInput(value: unknown): value is SaveNoteInput {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return (
    typeof body.title === 'string' &&
    typeof body.content === 'object' &&
    body.content !== null &&
    (body.museNotes === undefined || Array.isArray(body.museNotes))
  )
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const note = await readNote(getVaultRoot(), params.id)
    return NextResponse.json(note)
  } catch {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }
}

export async function PUT(req: Request, { params }: Params) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!isSaveNoteInput(body)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  try {
    const note = await saveNote(getVaultRoot(), params.id, body)
    return NextResponse.json(note)
  } catch {
    return NextResponse.json({ error: 'Unable to save note' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await deleteNote(getVaultRoot(), params.id)
    return NextResponse.json({})
  } catch {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }
}
