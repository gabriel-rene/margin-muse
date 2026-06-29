import { mkdir, readdir, readFile, rename, stat, writeFile } from 'fs/promises'
import path from 'path'
import {
  buildMarkdownFile,
  markdownToTiptapDoc,
  parseMarkdownFile,
  slugifyTitle,
  timestampForFilename,
  tiptapDocToMarkdown,
} from '@/lib/markdown'
import { EMPTY_TIPTAP_DOC, type CreateNoteInput, type NoteMeta, type NoteRecord, type SaveNoteInput, type VersionMeta } from '@/lib/note-types'

export function getVaultRoot(envPath = process.env.MUSE_VAULT_DIR): string {
  return path.resolve(envPath || path.join(process.cwd(), 'notes'))
}

export function vaultPath(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(resolvedRoot, ...segments)
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error('Resolved path is outside vault root')
  }
  return resolved
}

async function ensureVault(root: string): Promise<void> {
  await mkdir(root, { recursive: true })
  await mkdir(vaultPath(root, '.versions'), { recursive: true })
}

function idFromSlug(slug: string, created = new Date()): string {
  return `${timestampForFilename(created)}-${slug}`
}

async function uniqueSlug(root: string, base: string): Promise<string> {
  let slug = base
  let counter = 2
  while (true) {
    try {
      await stat(vaultPath(root, `${slug}.md`))
      slug = `${base}-${counter}`
      counter += 1
    } catch {
      return slug
    }
  }
}

async function writeAtomic(filePath: string, content: string): Promise<void> {
  const tmp = `${filePath}.tmp`
  await writeFile(tmp, content, 'utf8')
  await rename(tmp, filePath)
}

async function findNoteFile(root: string, id: string): Promise<string> {
  await ensureVault(root)
  const files = await readdir(root)
  for (const file of files.filter((item) => item.endsWith('.md'))) {
    const markdown = await readFile(vaultPath(root, file), 'utf8')
    const parsed = parseMarkdownFile(markdown, file)
    if (parsed.meta.id === id || parsed.meta.slug === id) return file
  }
  throw new Error('Note not found')
}

export async function createNote(root: string, input: CreateNoteInput = {}): Promise<NoteRecord> {
  await ensureVault(root)
  const created = new Date()
  const title = input.title?.trim() || `Untitled ${timestampForFilename(created)}`
  const slug = await uniqueSlug(root, slugifyTitle(title))
  const filename = `${slug}.md`
  const meta: NoteMeta = {
    id: idFromSlug(slug, created),
    title,
    slug,
    filename,
    created: created.toISOString(),
    updated: created.toISOString(),
  }
  const content = input.content ?? EMPTY_TIPTAP_DOC
  const body = tiptapDocToMarkdown(content)
  const markdown = buildMarkdownFile({ meta, body, museNotes: [] })
  await writeAtomic(vaultPath(root, filename), markdown)
  return { ...meta, markdown, content, museNotes: [] }
}

export async function listNotes(root: string): Promise<NoteMeta[]> {
  await ensureVault(root)
  const files = (await readdir(root)).filter((file) => file.endsWith('.md'))
  const notes = await Promise.all(
    files.map(async (file) => {
      const markdown = await readFile(vaultPath(root, file), 'utf8')
      return parseMarkdownFile(markdown, file).meta
    })
  )
  return notes.sort((a, b) => b.updated.localeCompare(a.updated))
}

export async function readNote(root: string, id: string): Promise<NoteRecord> {
  const filename = await findNoteFile(root, id)
  const markdown = await readFile(vaultPath(root, filename), 'utf8')
  const parsed = parseMarkdownFile(markdown, filename)
  const bodyWithoutTitle = parsed.body.replace(/^# .+\n\n?/, '').replace(/\n## Muse Notes\n[\s\S]*$/, '')
  return {
    ...parsed.meta,
    markdown,
    content: markdownToTiptapDoc(bodyWithoutTitle),
    museNotes: [],
  }
}

export async function saveNote(root: string, id: string, input: SaveNoteInput): Promise<NoteRecord> {
  const current = await readNote(root, id)
  const now = new Date().toISOString()
  const title = input.title.trim() || current.title
  const nextSlug = slugifyTitle(title)
  const meta: NoteMeta = {
    ...current,
    title,
    slug: nextSlug,
    filename: `${nextSlug}.md`,
    updated: now,
  }

  if (current.filename !== meta.filename) {
    try {
      await stat(vaultPath(root, meta.filename))
      meta.slug = await uniqueSlug(root, nextSlug)
      meta.filename = `${meta.slug}.md`
    } catch {
      await rename(vaultPath(root, current.filename), vaultPath(root, meta.filename))
    }
  }

  const body = tiptapDocToMarkdown(input.content)
  const markdown = buildMarkdownFile({ meta, body, museNotes: input.museNotes ?? [] })
  await writeAtomic(vaultPath(root, meta.filename), markdown)
  return { ...meta, markdown, content: input.content, museNotes: input.museNotes ?? [] }
}

export async function snapshotNote(root: string, id: string, date = new Date()): Promise<VersionMeta> {
  const note = await readNote(root, id)
  const versionDir = vaultPath(root, '.versions', note.slug)
  await mkdir(versionDir, { recursive: true })
  const filename = `${timestampForFilename(date)}.md`
  await writeAtomic(vaultPath(versionDir, filename), note.markdown)
  return {
    id: filename.replace(/\.md$/, ''),
    noteId: note.id,
    filename,
    created: date.toISOString(),
    title: note.title,
  }
}

export async function listVersions(root: string, id: string): Promise<VersionMeta[]> {
  const note = await readNote(root, id)
  const versionDir = vaultPath(root, '.versions', note.slug)
  try {
    const files = (await readdir(versionDir)).filter((file) => file.endsWith('.md'))
    return files
      .map((filename) => ({
        id: filename.replace(/\.md$/, ''),
        noteId: note.id,
        filename,
        created: filename.replace(/\.md$/, '').replace(/T(\d\d)-(\d\d)-(\d\d)$/, 'T$1:$2:$3.000Z'),
        title: note.title,
      }))
      .sort((a, b) => b.filename.localeCompare(a.filename))
  } catch {
    return []
  }
}
