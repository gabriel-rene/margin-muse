import { mkdtemp, rm } from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_TIPTAP_DOC } from '@/lib/note-types'

let root: string

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'muse-api-'))
  vi.stubEnv('MUSE_VAULT_DIR', root)
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(root, { recursive: true, force: true })
})

describe('notes API', () => {
  it('creates, lists, reads, saves, and snapshots notes', async () => {
    const notesRoute = await import('@/app/api/notes/route')
    const createRes = await notesRoute.POST(
      new Request('http://localhost/api/notes', {
        method: 'POST',
        body: JSON.stringify({ title: 'API Draft', content: EMPTY_TIPTAP_DOC }),
      })
    )
    expect(createRes.status).toBe(200)
    const created = await createRes.json()
    expect(created.title).toBe('API Draft')

    const listRes = await notesRoute.GET()
    expect(listRes.status).toBe(200)
    const list = await listRes.json()
    expect(list.notes).toHaveLength(1)

    const noteRoute = await import('@/app/api/notes/[id]/route')
    const readRes = await noteRoute.GET(new Request(`http://localhost/api/notes/${created.id}`), {
      params: { id: created.id },
    })
    expect(readRes.status).toBe(200)

    const saveRes = await noteRoute.PUT(
      new Request(`http://localhost/api/notes/${created.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Saved API Draft',
          content: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Saved text' }] }],
          },
          museNotes: [],
        }),
      }),
      { params: { id: created.id } }
    )
    expect(saveRes.status).toBe(200)
    const saved = await saveRes.json()
    expect(saved.title).toBe('Saved API Draft')

    const versionsRoute = await import('@/app/api/notes/[id]/versions/route')
    const snapshotRes = await versionsRoute.POST(
      new Request(`http://localhost/api/notes/${created.id}/versions`, { method: 'POST' }),
      { params: { id: created.id } }
    )
    expect(snapshotRes.status).toBe(200)

    const versionsRes = await versionsRoute.GET(
      new Request(`http://localhost/api/notes/${created.id}/versions`),
      { params: { id: created.id } }
    )
    expect(versionsRes.status).toBe(200)
    const versions = await versionsRes.json()
    expect(versions.versions).toHaveLength(1)
  })

  it('rejects invalid save payloads', async () => {
    const noteRoute = await import('@/app/api/notes/[id]/route')
    const res = await noteRoute.PUT(
      new Request('http://localhost/api/notes/missing', {
        method: 'PUT',
        body: JSON.stringify({ title: 123, content: null }),
      }),
      { params: { id: 'missing' } }
    )
    expect(res.status).toBe(400)
  })
})
