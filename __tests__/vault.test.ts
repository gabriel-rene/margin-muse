import { mkdtemp, readFile, readdir, rm, stat } from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createNote,
  deleteNote,
  getVaultRoot,
  listNotes,
  listVersions,
  readNote,
  saveNote,
  snapshotNote,
  vaultPath,
} from '@/lib/vault'
import { EMPTY_TIPTAP_DOC, type TiptapDoc } from '@/lib/note-types'

function paragraphDoc(text: string): TiptapDoc {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

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

  it('renaming into a title collision keeps a single file for the note', async () => {
    await createNote(root, { title: 'Alpha' })
    const beta = await createNote(root, { title: 'Beta' })

    await saveNote(root, beta.id, {
      title: 'Alpha',
      content: paragraphDoc('now called alpha'),
    })

    const files = (await readdir(root)).filter((f) => f.endsWith('.md'))
    expect(files.sort()).toEqual(['alpha-2.md', 'alpha.md'])

    const read = await readNote(root, beta.id)
    expect(read.title).toBe('Alpha')
    expect(read.content.content?.[0]?.content?.[0]?.text).toBe('now called alpha')
    expect(await listNotes(root)).toHaveLength(2)
  })

  it('persists and restores muse notes across save/read cycles', async () => {
    const note = await createNote(root, { title: 'With Muse' })
    await saveNote(root, note.id, {
      title: 'With Muse',
      content: paragraphDoc('The prose.'),
      museNotes: [
        {
          id: 'm1',
          persona: 'skeptic',
          question: 'What backs this claim?',
          anchorTop: 42,
          createdAt: Date.parse('2026-06-29T13:04:00.000Z'),
        },
      ],
    })

    const restored = await readNote(root, note.id)
    expect(restored.museNotes).toHaveLength(1)
    expect(restored.museNotes[0].question).toBe('What backs this claim?')
    // The body must not leak the muse section into the editor content.
    const text = JSON.stringify(restored.content)
    expect(text).not.toContain('Muse Notes')

    // A later save without muse notes clears the section intentionally
    // (dismissals persist), not by accident.
    await saveNote(root, note.id, {
      title: 'With Muse',
      content: paragraphDoc('The prose.'),
      museNotes: [],
    })
    const cleared = await readNote(root, note.id)
    expect(cleared.museNotes).toEqual([])
  })

  it('moves snapshots when a note is renamed and removes them on delete', async () => {
    const note = await createNote(root, { title: 'History' })
    await snapshotNote(root, note.id, new Date('2026-06-29T13:04:22.000Z'))

    await saveNote(root, note.id, { title: 'Renamed History', content: paragraphDoc('x') })
    const versions = await listVersions(root, note.id)
    expect(versions).toHaveLength(1)

    await deleteNote(root, note.id)
    await expect(stat(vaultPath(root, '.versions', 'renamed-history'))).rejects.toThrow()
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
