import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_TIPTAP_DOC } from '@/lib/note-types'
import { createNoteClient, listNotesClient, saveNoteClient, snapshotNoteClient } from '@/lib/notes-client'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('notes-client', () => {
  it('lists notes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ notes: [{ id: '1', title: 'A' }] })))
    const notes = await listNotesClient()
    expect(notes[0].title).toBe('A')
  })

  it('throws on failed requests', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    await expect(listNotesClient()).rejects.toThrow('Notes API error')
  })

  it('creates, saves, and snapshots notes', async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: '1', title: 'A' }))
    vi.stubGlobal('fetch', fetchMock)
    await createNoteClient('A')
    await saveNoteClient('1', { title: 'A', content: EMPTY_TIPTAP_DOC, museNotes: [] })
    await snapshotNoteClient('1')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
