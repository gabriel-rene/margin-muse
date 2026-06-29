import { mkdtemp, readFile, rm } from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createNote,
  getVaultRoot,
  listNotes,
  listVersions,
  readNote,
  saveNote,
  snapshotNote,
  vaultPath,
} from '@/lib/vault'
import { EMPTY_TIPTAP_DOC } from '@/lib/note-types'

let root: string

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'muse-vault-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('vault paths', () => {
  it('defaults to notes inside cwd', () => {
    expect(getVaultRoot(undefined).endsWith(`${path.sep}notes`)).toBe(true)
  })

  it('uses env override when provided', () => {
    expect(getVaultRoot(root)).toBe(path.resolve(root))
  })

  it('rejects traversal outside vault root', () => {
    expect(() => vaultPath(root, '../escape.md')).toThrow('outside vault')
  })
})

describe('vault notes', () => {
  it('creates, lists, reads, and saves a note', async () => {
    const note = await createNote(root, { title: 'My Draft', content: EMPTY_TIPTAP_DOC })
    expect(note.title).toBe('My Draft')
    expect(note.filename).toBe('my-draft.md')

    const notes = await listNotes(root)
    expect(notes).toHaveLength(1)
    expect(notes[0].title).toBe('My Draft')

    const read = await readNote(root, note.id)
    expect(read.title).toBe('My Draft')

    const saved = await saveNote(root, note.id, {
      title: 'Renamed Draft',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
      },
      museNotes: [],
    })
    expect(saved.title).toBe('Renamed Draft')

    const file = await readFile(path.join(root, 'renamed-draft.md'), 'utf8')
    expect(file).toContain('Hello')
  })

  it('creates manual snapshots', async () => {
    const note = await createNote(root, { title: 'Snapshot Me', content: EMPTY_TIPTAP_DOC })
    const version = await snapshotNote(root, note.id, new Date('2026-06-29T13:04:22.000Z'))
    expect(version.filename).toBe('2026-06-29T13-04-22.md')

    const versions = await listVersions(root, note.id)
    expect(versions).toHaveLength(1)
    expect(versions[0].title).toBe('Snapshot Me')
  })
})
