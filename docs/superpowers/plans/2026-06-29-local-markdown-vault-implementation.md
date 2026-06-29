# Local Markdown Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the local writing experience: folder-backed Markdown notes, title-driven saving, manual snapshots, rich-text toolbar, and the layered paper workspace.

**Architecture:** Keep Tiptap as the browser editing model and write Markdown through local-only Next.js filesystem API routes. Server-only vault utilities own path resolution, Markdown/frontmatter conversion, atomic writes, note listing, and snapshots; client components consume those routes and never touch `fs`. AI/muse API integrations remain out of scope for this phase.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Tiptap/ProseMirror, Tailwind CSS, Vitest/jsdom, Node `fs/promises`, `markdown-it` for Markdown parsing.

---

## Scope Guard

This plan intentionally does **not** implement or improve Anthropic/muse integration. Do not modify `app/api/muse/route.ts`, `lib/muse-client.ts`, or persona prompts except if a type import breaks compilation. Existing muse behavior can remain, but the new writing/file experience must work without an API key.

First milestone includes:

- Local Markdown note list.
- Create/open/save note.
- Editable title.
- Manual timestamped snapshots.
- Centered floating rich-text toolbar.
- Layered desk/paper visual direction.
- Current localStorage draft import affordance.

First milestone excludes:

- Restore-from-version.
- Muse notes appended into Markdown.
- AI route hardening.
- External Obsidian vault path UI.

## File Structure

Create:

- `lib/note-types.ts` — shared note, snapshot, and Tiptap JSON types.
- `lib/markdown.ts` — frontmatter parsing/formatting, Tiptap JSON to Markdown, Markdown to Tiptap JSON.
- `lib/vault.ts` — server-only local filesystem vault operations and path safety.
- `lib/notes-client.ts` — browser fetch wrapper for note API routes.
- `app/api/notes/route.ts` — list and create notes.
- `app/api/notes/[id]/route.ts` — read and save one note.
- `app/api/notes/[id]/versions/route.ts` — list and create snapshots.
- `components/WorkspaceShell.tsx` — layered desk layout.
- `components/NotesPanel.tsx` — note list and new-note action.
- `components/VersionsPanel.tsx` — snapshot list and save-version action.
- `components/TitleField.tsx` — quiet editable title.
- `components/EditorToolbar.tsx` — hidden-by-default centered floating toolbar.
- `__tests__/markdown.test.ts` — Markdown/frontmatter unit tests.
- `__tests__/vault.test.ts` — vault filesystem/path unit tests.
- `__tests__/notes-api.test.ts` — route contract tests.
- `__tests__/editor-toolbar.test.tsx` — toolbar component tests.

Modify:

- `package.json` / `package-lock.json` — add `markdown-it` and `@types/markdown-it`.
- `lib/types.ts` — keep existing muse types; do not overload it with note/vault types.
- `lib/storage.ts` — keep current localStorage helpers for migration/fallback.
- `components/Editor.tsx` — make editor controlled enough for note loading/saving and expose formatting commands through toolbar props.
- `components/MarginRail.tsx` — preserve current margin behavior near paper sheet.
- `app/page.tsx` — orchestrate notes, active note, autosave, snapshots, import existing localStorage draft.
- `app/globals.css` — layered workspace, richer grain, focused paper sheet, toolbar motion.
- `README.md` — local vault run notes and AI-on-hold note.

## Task 1: Add Dependencies And Shared Note Types

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/note-types.ts`

- [ ] **Step 1: Install Markdown parser dependency**

Run:

```bash
npm install markdown-it
npm install -D @types/markdown-it
```

Expected:

- `package.json` includes `markdown-it` in `dependencies`.
- `package.json` includes `@types/markdown-it` in `devDependencies`.
- `package-lock.json` updates.

- [ ] **Step 2: Create shared note types**

Create `lib/note-types.ts`:

```ts
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
```

- [ ] **Step 3: Run type check through build**

Run:

```bash
npm run build
```

Expected: build succeeds, or fails only because later files are not created yet if this task is run after partial edits. If it fails now, fix type/export mistakes before moving on.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/note-types.ts
git commit -m "feat: add markdown note types"
```

## Task 2: Markdown And Frontmatter Utilities

**Files:**

- Create: `lib/markdown.ts`
- Test: `__tests__/markdown.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/markdown.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  buildMarkdownFile,
  markdownToTiptapDoc,
  parseMarkdownFile,
  slugifyTitle,
  timestampForFilename,
  tiptapDocToMarkdown,
} from '@/lib/markdown'
import { type TiptapDoc } from '@/lib/note-types'

describe('slugifyTitle', () => {
  it('creates filesystem-safe slugs', () => {
    expect(slugifyTitle('My First Note!')).toBe('my-first-note')
    expect(slugifyTitle('  Strange / Path .. Name  ')).toBe('strange-path-name')
  })

  it('falls back to untitled when title has no usable characters', () => {
    expect(slugifyTitle('///')).toBe('untitled')
  })
})

describe('timestampForFilename', () => {
  it('uses sortable filename-safe timestamps', () => {
    expect(timestampForFilename(new Date('2026-06-29T13:04:22.000Z'))).toBe(
      '2026-06-29T13-04-22'
    )
  })
})

describe('frontmatter markdown files', () => {
  it('builds and parses note frontmatter', () => {
    const markdown = buildMarkdownFile({
      meta: {
        id: 'note-1',
        title: 'My Note',
        slug: 'my-note',
        filename: 'my-note.md',
        created: '2026-06-29T13:00:00.000Z',
        updated: '2026-06-29T13:05:00.000Z',
      },
      body: 'Hello world.',
      museNotes: [],
    })

    expect(markdown).toContain('title: My Note')
    expect(markdown).toContain('# My Note')

    const parsed = parseMarkdownFile(markdown, 'my-note.md')
    expect(parsed.meta.title).toBe('My Note')
    expect(parsed.body).toContain('Hello world.')
  })
})

describe('Tiptap Markdown conversion', () => {
  it('serializes supported rich text', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Section' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }],
            },
          ],
        },
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'quote' }] }],
        },
      ],
    }

    expect(tiptapDocToMarkdown(doc)).toBe(
      '## Section\n\nHello **bold** and *italic*\n\n- item\n\n> quote'
    )
  })

  it('parses basic markdown back to Tiptap JSON', () => {
    const doc = markdownToTiptapDoc('## Section\n\nHello **bold** and *italic*\n\n- item\n')
    expect(doc.type).toBe('doc')
    expect(doc.content?.[0]?.type).toBe('heading')
    expect(doc.content?.[1]?.type).toBe('paragraph')
    expect(doc.content?.[2]?.type).toBe('bulletList')
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- __tests__/markdown.test.ts
```

Expected: FAIL because `lib/markdown.ts` does not exist.

- [ ] **Step 3: Implement Markdown utilities**

Create `lib/markdown.ts`:

```ts
import MarkdownIt from 'markdown-it'
import { EMPTY_TIPTAP_DOC, type NoteMeta, type TiptapDoc, type TiptapMark, type TiptapNode } from '@/lib/note-types'
import { type MuseNoteData } from '@/lib/types'

const md = new MarkdownIt({ html: false, linkify: false, typographer: false })

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'untitled'
}

export function timestampForFilename(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '').replace(/:/g, '-')
}

function escapeYamlValue(value: string): string {
  if (/[:#\n\r]/.test(value)) return JSON.stringify(value)
  return value
}

function escapeMarkdownText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\*/g, '\\*').replace(/_/g, '\\_')
}

function applyMarks(text: string, marks: TiptapMark[] = []): string {
  return marks.reduce((current, mark) => {
    if (mark.type === 'bold') return `**${current}**`
    if (mark.type === 'italic') return `*${current}*`
    if (mark.type === 'link') {
      const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : ''
      return href ? `[${current}](${href})` : current
    }
    return current
  }, escapeMarkdownText(text))
}

function inlineContent(nodes: TiptapNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return applyMarks(node.text ?? '', node.marks)
      if (node.type === 'hardBreak') return '  \n'
      return inlineContent(node.content)
    })
    .join('')
}

function blockToMarkdown(node: TiptapNode, orderedIndex?: number): string {
  if (node.type === 'paragraph') return inlineContent(node.content)
  if (node.type === 'heading') {
    const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 3)
    return `${'#'.repeat(level)} ${inlineContent(node.content)}`
  }
  if (node.type === 'blockquote') {
    return (node.content ?? [])
      .map((child) => blockToMarkdown(child))
      .join('\n\n')
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
  }
  if (node.type === 'bulletList') {
    return (node.content ?? [])
      .map((item) => `- ${listItemText(item)}`)
      .join('\n')
  }
  if (node.type === 'orderedList') {
    return (node.content ?? [])
      .map((item, index) => `${index + 1}. ${listItemText(item)}`)
      .join('\n')
  }
  if (node.type === 'listItem') return `${orderedIndex ?? '-'} ${listItemText(node)}`
  return inlineContent(node.content)
}

function listItemText(item: TiptapNode): string {
  return (item.content ?? []).map((child) => blockToMarkdown(child)).join(' ').trim()
}

export function tiptapDocToMarkdown(doc: TiptapDoc): string {
  return (doc.content ?? [])
    .map((node) => blockToMarkdown(node))
    .filter((block) => block.trim().length > 0)
    .join('\n\n')
}

function textNode(text: string, marks?: TiptapMark[]): TiptapNode {
  return marks?.length ? { type: 'text', text, marks } : { type: 'text', text }
}

function inlineMarkdownToNodes(text: string): TiptapNode[] {
  const nodes: TiptapNode[] = []
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(textNode(text.slice(lastIndex, match.index)))
    if (match[2]) nodes.push(textNode(match[2], [{ type: 'bold' }]))
    else if (match[3]) nodes.push(textNode(match[3], [{ type: 'italic' }]))
    else if (match[4]) nodes.push(textNode(match[4], [{ type: 'link', attrs: { href: match[5] } }]))
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) nodes.push(textNode(text.slice(lastIndex)))
  return nodes.length ? nodes : [{ type: 'text', text }]
}

export function markdownToTiptapDoc(markdown: string): TiptapDoc {
  const tokens = md.parse(markdown, {})
  const content: TiptapNode[] = []
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.type === 'heading_open') {
      const level = Number(token.tag.replace('h', '')) || 1
      const inline = tokens[i + 1]?.content ?? ''
      content.push({ type: 'heading', attrs: { level }, content: inlineMarkdownToNodes(inline) })
    }
    if (token.type === 'paragraph_open') {
      const inline = tokens[i + 1]?.content ?? ''
      content.push({ type: 'paragraph', content: inlineMarkdownToNodes(inline) })
    }
    if (token.type === 'bullet_list_open') {
      const items: TiptapNode[] = []
      for (i += 1; i < tokens.length && tokens[i].type !== 'bullet_list_close'; i += 1) {
        if (tokens[i].type === 'inline') {
          items.push({
            type: 'listItem',
            content: [{ type: 'paragraph', content: inlineMarkdownToNodes(tokens[i].content) }],
          })
        }
      }
      content.push({ type: 'bulletList', content: items })
    }
    if (token.type === 'ordered_list_open') {
      const items: TiptapNode[] = []
      for (i += 1; i < tokens.length && tokens[i].type !== 'ordered_list_close'; i += 1) {
        if (tokens[i].type === 'inline') {
          items.push({
            type: 'listItem',
            content: [{ type: 'paragraph', content: inlineMarkdownToNodes(tokens[i].content) }],
          })
        }
      }
      content.push({ type: 'orderedList', attrs: { start: 1 }, content: items })
    }
    if (token.type === 'blockquote_open') {
      const quoteChildren: TiptapNode[] = []
      for (i += 1; i < tokens.length && tokens[i].type !== 'blockquote_close'; i += 1) {
        if (tokens[i].type === 'inline') {
          quoteChildren.push({ type: 'paragraph', content: inlineMarkdownToNodes(tokens[i].content) })
        }
      }
      content.push({ type: 'blockquote', content: quoteChildren })
    }
  }
  return content.length ? { type: 'doc', content } : EMPTY_TIPTAP_DOC
}

export function parseMarkdownFile(markdown: string, filename: string): { meta: NoteMeta; body: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  const frontmatter = match?.[1] ?? ''
  const body = match?.[2] ?? markdown
  const values = Object.fromEntries(
    frontmatter
      .split('\n')
      .map((line) => line.match(/^([^:]+):\s*(.*)$/))
      .filter((line): line is RegExpMatchArray => Boolean(line))
      .map((line) => [line[1].trim(), line[2].trim().replace(/^"|"$/g, '')])
  )
  const title = values.title || filename.replace(/\.md$/, '')
  const slug = values.slug || slugifyTitle(title)
  const now = new Date().toISOString()
  return {
    meta: {
      id: values.id || slug,
      title,
      slug,
      filename,
      created: values.created || now,
      updated: values.updated || now,
    },
    body,
  }
}

export function buildMarkdownFile({
  meta,
  body,
  museNotes,
}: {
  meta: NoteMeta
  body: string
  museNotes: MuseNoteData[]
}): string {
  const frontmatter = [
    '---',
    `id: ${escapeYamlValue(meta.id)}`,
    `title: ${escapeYamlValue(meta.title)}`,
    `slug: ${escapeYamlValue(meta.slug)}`,
    `created: ${meta.created}`,
    `updated: ${meta.updated}`,
    'version: current',
    '---',
    '',
  ].join('\n')
  const titleHeading = `# ${meta.title || 'Untitled'}`
  const museSection = museNotes.length
    ? `\n\n## Muse Notes\n\n${museNotes
        .map((note) => {
          const created = new Date(note.createdAt).toISOString().replace('T', ' ').slice(0, 16)
          return `### ${created} - ${note.persona}\n\n> ${note.question}`
        })
        .join('\n\n')}`
    : ''
  return `${frontmatter}${titleHeading}\n\n${body.trim()}${museSection}\n`
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- __tests__/markdown.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/markdown.ts __tests__/markdown.test.ts
git commit -m "feat: add markdown note serialization"
```

## Task 3: Server-Only Vault Filesystem Utilities

**Files:**

- Create: `lib/vault.ts`
- Test: `__tests__/vault.test.ts`

- [ ] **Step 1: Write failing vault tests**

Create `__tests__/vault.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- __tests__/vault.test.ts
```

Expected: FAIL because `lib/vault.ts` does not exist.

- [ ] **Step 3: Implement vault utilities**

Create `lib/vault.ts`:

```ts
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
```

- [ ] **Step 4: Run vault tests**

Run:

```bash
npm test -- __tests__/vault.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/vault.ts __tests__/vault.test.ts
git commit -m "feat: add local markdown vault"
```

## Task 4: Notes API Routes

**Files:**

- Create: `app/api/notes/route.ts`
- Create: `app/api/notes/[id]/route.ts`
- Create: `app/api/notes/[id]/versions/route.ts`
- Test: `__tests__/notes-api.test.ts`

- [ ] **Step 1: Write failing API route tests**

Create `__tests__/notes-api.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- __tests__/notes-api.test.ts
```

Expected: FAIL because API route files do not exist.

- [ ] **Step 3: Implement `app/api/notes/route.ts`**

Create `app/api/notes/route.ts`:

```ts
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
```

- [ ] **Step 4: Implement note read/save route**

Create `app/api/notes/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getVaultRoot, readNote, saveNote } from '@/lib/vault'
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
```

- [ ] **Step 5: Implement version route**

Create `app/api/notes/[id]/versions/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getVaultRoot, listVersions, snapshotNote } from '@/lib/vault'

export const runtime = 'nodejs'

interface Params {
  params: { id: string }
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const versions = await listVersions(getVaultRoot(), params.id)
    return NextResponse.json({ versions })
  } catch {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const version = await snapshotNote(getVaultRoot(), params.id)
    return NextResponse.json(version)
  } catch {
    return NextResponse.json({ error: 'Unable to snapshot note' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Run API tests**

Run:

```bash
npm test -- __tests__/notes-api.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/notes __tests__/notes-api.test.ts
git commit -m "feat: add local notes API"
```

## Task 5: Browser Notes Client

**Files:**

- Create: `lib/notes-client.ts`
- Test: `__tests__/notes-client.test.ts`

- [ ] **Step 1: Write failing client tests**

Create `__tests__/notes-client.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- __tests__/notes-client.test.ts
```

Expected: FAIL because `lib/notes-client.ts` does not exist.

- [ ] **Step 3: Implement client wrapper**

Create `lib/notes-client.ts`:

```ts
import { type NoteMeta, type NoteRecord, type SaveNoteInput, type VersionMeta } from '@/lib/note-types'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`Notes API error: ${res.status}`)
  return res.json()
}

export async function listNotesClient(): Promise<NoteMeta[]> {
  const result = await api<{ notes: NoteMeta[] }>('/api/notes')
  return result.notes
}

export async function createNoteClient(title?: string): Promise<NoteRecord> {
  return api<NoteRecord>('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}

export async function readNoteClient(id: string): Promise<NoteRecord> {
  return api<NoteRecord>(`/api/notes/${encodeURIComponent(id)}`)
}

export async function saveNoteClient(id: string, input: SaveNoteInput): Promise<NoteRecord> {
  return api<NoteRecord>(`/api/notes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function listVersionsClient(id: string): Promise<VersionMeta[]> {
  const result = await api<{ versions: VersionMeta[] }>(
    `/api/notes/${encodeURIComponent(id)}/versions`
  )
  return result.versions
}

export async function snapshotNoteClient(id: string): Promise<VersionMeta> {
  return api<VersionMeta>(`/api/notes/${encodeURIComponent(id)}/versions`, {
    method: 'POST',
  })
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- __tests__/notes-client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/notes-client.ts __tests__/notes-client.test.ts
git commit -m "feat: add notes client"
```

## Task 6: Rich Text Toolbar And Controlled Editor

**Files:**

- Create: `components/EditorToolbar.tsx`
- Modify: `components/Editor.tsx`
- Test: `__tests__/editor-toolbar.test.tsx`

- [ ] **Step 1: Write toolbar tests**

Create `__tests__/editor-toolbar.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EditorToolbar from '@/components/EditorToolbar'

describe('EditorToolbar', () => {
  it('is collapsed by default and opens from the toggle', () => {
    render(
      <EditorToolbar
        editor={null}
        canUndo={false}
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
      />
    )
    expect(screen.queryByLabelText('Bold')).toBeNull()
    fireEvent.click(screen.getByLabelText('Show formatting toolbar'))
    expect(screen.getByLabelText('Bold')).toBeInTheDocument()
  })

  it('runs undo and redo callbacks', () => {
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    render(<EditorToolbar editor={null} canUndo canRedo onUndo={onUndo} onRedo={onRedo} />)
    fireEvent.click(screen.getByLabelText('Show formatting toolbar'))
    fireEvent.click(screen.getByLabelText('Undo'))
    fireEvent.click(screen.getByLabelText('Redo'))
    expect(onUndo).toHaveBeenCalled()
    expect(onRedo).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- __tests__/editor-toolbar.test.tsx
```

Expected: FAIL because `EditorToolbar` does not exist.

- [ ] **Step 3: Implement `EditorToolbar`**

Create `components/EditorToolbar.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { type Editor as TiptapEditor } from '@tiptap/react'

interface Props {
  editor: TiptapEditor | null
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export default function EditorToolbar({ editor, canUndo, canRedo, onUndo, onRedo }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function run(command: () => void) {
    command()
    editor?.commands.focus()
  }

  return (
    <div ref={ref} className="editor-toolbar-wrap">
      <button
        type="button"
        className="editor-toolbar-toggle"
        aria-label={open ? 'Hide formatting toolbar' : 'Show formatting toolbar'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ✦
      </button>
      {open && (
        <div className="editor-toolbar" role="toolbar" aria-label="Formatting toolbar">
          <button type="button" aria-label="Bold" onClick={() => run(() => editor?.chain().focus().toggleBold().run())}>
            B
          </button>
          <button type="button" aria-label="Italic" onClick={() => run(() => editor?.chain().focus().toggleItalic().run())}>
            <em>I</em>
          </button>
          <button type="button" aria-label="Heading" onClick={() => run(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())}>
            H
          </button>
          <button type="button" aria-label="Bullet list" onClick={() => run(() => editor?.chain().focus().toggleBulletList().run())}>
            •
          </button>
          <button type="button" aria-label="Ordered list" onClick={() => run(() => editor?.chain().focus().toggleOrderedList().run())}>
            1
          </button>
          <button type="button" aria-label="Blockquote" onClick={() => run(() => editor?.chain().focus().toggleBlockquote().run())}>
            ”
          </button>
          <button type="button" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
            ↶
          </button>
          <button type="button" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
            ↷
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Modify `Editor.tsx` for controlled note content and toolbar**

Replace `components/Editor.tsx` with a version that accepts `content`, `onContentChange`, and keeps existing selection/muse behavior intact:

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { FocusDepthExtension } from '@/lib/focus-extension'
import MusePicker from '@/components/MusePicker'
import EditorToolbar from '@/components/EditorToolbar'
import { type PersonaId } from '@/lib/personas'
import { playTypingSound } from '@/lib/sound'
import { EMPTY_TIPTAP_DOC, type TiptapDoc } from '@/lib/note-types'

interface Props {
  contentKey: string | null
  content: TiptapDoc | null
  onContentChange: (content: TiptapDoc) => void
  onMusePick?: (persona: PersonaId, selectedText: string, contextText: string, anchorViewportTop: number) => void
  loading?: boolean
  soundEnabled?: boolean
  audioCtx?: AudioContext | null
}

export default function Editor({
  contentKey,
  content,
  onContentChange,
  onMusePick,
  loading = false,
  soundEnabled = false,
  audioCtx = null,
}: Props) {
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [historyTick, setHistoryTick] = useState(0)
  const applyingExternalContent = useRef(false)
  const lastContentKey = useRef<string | null>(null)

  const handleSelectionUpdate = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.toString().trim().length < 3) {
      setPickerRect(null)
      return
    }
    const range = sel.getRangeAt(0)
    setSelectedText(sel.toString().trim())
    setPickerRect(range.getBoundingClientRect())
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Begin writing…' }),
      FocusDepthExtension,
    ],
    content: content ?? EMPTY_TIPTAP_DOC,
    onSelectionUpdate: handleSelectionUpdate,
    onUpdate: ({ editor: e }) => {
      setHistoryTick((value) => value + 1)
      if (!applyingExternalContent.current) {
        onContentChange(e.getJSON() as TiptapDoc)
      }
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[60vh]',
      },
      handleKeyDown: (_view, event) => {
        if (soundEnabled && audioCtx && event.key.length === 1) {
          playTypingSound(audioCtx)
        }
        return false
      },
    },
  })

  useEffect(() => {
    if (!editor || !content) return
    if (lastContentKey.current === contentKey) return
    lastContentKey.current = contentKey
    applyingExternalContent.current = true
    editor.commands.setContent(content)
    applyingExternalContent.current = false
  }, [content, contentKey, editor])

  function handlePick(persona: PersonaId) {
    if (!pickerRect) return
    const anchorViewportTop = pickerRect.top
    setPickerRect(null)
    const context = editor?.getText() ?? ''
    onMusePick?.(persona, selectedText, context, anchorViewportTop)
  }

  return (
    <div className="editor-wrap relative">
      <EditorToolbar
        editor={editor}
        canUndo={Boolean(editor?.can().undo()) && historyTick >= 0}
        canRedo={Boolean(editor?.can().redo()) && historyTick >= 0}
        onUndo={() => editor?.chain().focus().undo().run()}
        onRedo={() => editor?.chain().focus().redo().run()}
      />
      {loading && (
        <div
          style={{ fontFamily: 'var(--font-muse)', color: 'var(--paper-muse-ink)' }}
          className="absolute top-0 right-0 text-xs opacity-50 animate-pulse"
        >
          thinking…
        </div>
      )}
      <EditorContent editor={editor} />
      {pickerRect && !loading && (
        <MusePicker anchorRect={pickerRect} onPick={handlePick} onClose={() => setPickerRect(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run toolbar tests**

Run:

```bash
npm test -- __tests__/editor-toolbar.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/EditorToolbar.tsx components/Editor.tsx __tests__/editor-toolbar.test.tsx
git commit -m "feat: add centered editor toolbar"
```

## Task 7: Workspace Panels And Title Field

**Files:**

- Create: `components/WorkspaceShell.tsx`
- Create: `components/NotesPanel.tsx`
- Create: `components/VersionsPanel.tsx`
- Create: `components/TitleField.tsx`

- [ ] **Step 1: Create title field**

Create `components/TitleField.tsx`:

```tsx
'use client'

interface Props {
  title: string
  onChange: (title: string) => void
}

export default function TitleField({ title, onChange }: Props) {
  return (
    <input
      className="title-field"
      value={title}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Untitled"
      aria-label="Note title"
    />
  )
}
```

- [ ] **Step 2: Create notes panel**

Create `components/NotesPanel.tsx`:

```tsx
'use client'

import { type NoteMeta } from '@/lib/note-types'

interface Props {
  notes: NoteMeta[]
  activeNoteId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onImportDraft?: () => void
}

export default function NotesPanel({ notes, activeNoteId, onSelect, onCreate, onImportDraft }: Props) {
  return (
    <aside className="notes-panel" aria-label="Local notes">
      <div className="panel-kicker">Notes</div>
      <button type="button" className="panel-action" onClick={onCreate}>
        New note
      </button>
      {onImportDraft && (
        <button type="button" className="panel-action subtle" onClick={onImportDraft}>
          Import current draft
        </button>
      )}
      <div className="panel-list">
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            className={note.id === activeNoteId ? 'panel-row active' : 'panel-row'}
            onClick={() => onSelect(note.id)}
          >
            <span>{note.title}</span>
            <time>{new Date(note.updated).toLocaleDateString()}</time>
          </button>
        ))}
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Create versions panel**

Create `components/VersionsPanel.tsx`:

```tsx
'use client'

import { type VersionMeta } from '@/lib/note-types'

interface Props {
  versions: VersionMeta[]
  onSnapshot: () => void
  disabled?: boolean
}

export default function VersionsPanel({ versions, onSnapshot, disabled = false }: Props) {
  return (
    <aside className="versions-panel" aria-label="Versions">
      <div className="panel-kicker">Versions</div>
      <button type="button" className="panel-action" disabled={disabled} onClick={onSnapshot}>
        Save version
      </button>
      <div className="panel-list">
        {versions.map((version) => (
          <div key={version.id} className="panel-row read-only">
            <span>{version.title}</span>
            <time>{new Date(version.created).toLocaleString()}</time>
          </div>
        ))}
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Create workspace shell**

Create `components/WorkspaceShell.tsx`:

```tsx
'use client'

import { type ReactNode } from 'react'

interface Props {
  notesPanel: ReactNode
  versionsPanel: ReactNode
  paper: ReactNode
  controls: ReactNode
}

export default function WorkspaceShell({ notesPanel, versionsPanel, paper, controls }: Props) {
  return (
    <main className="workspace-shell">
      <div className="workspace-texture" aria-hidden="true" />
      {notesPanel}
      <section className="paper-sheet" aria-label="Writing surface">
        {paper}
      </section>
      {versionsPanel}
      <div className="workspace-controls">{controls}</div>
    </main>
  )
}
```

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: May fail until `app/page.tsx` uses the new required `Editor` props. Continue to Task 8 if the only errors are from `Editor` call sites.

- [ ] **Step 6: Commit**

```bash
git add components/WorkspaceShell.tsx components/NotesPanel.tsx components/VersionsPanel.tsx components/TitleField.tsx
git commit -m "feat: add workspace panels"
```

## Task 8: Page Integration, Autosave, Snapshot, Draft Import

**Files:**

- Modify: `app/page.tsx`

- [ ] **Step 1: Replace page orchestration**

Modify `app/page.tsx` to own active note state, debounced saving, and snapshot actions:

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'
import NotesPanel from '@/components/NotesPanel'
import PaperToneSwitch from '@/components/PaperToneSwitch'
import SoundToggle from '@/components/SoundToggle'
import TitleField from '@/components/TitleField'
import VersionsPanel from '@/components/VersionsPanel'
import WorkspaceShell from '@/components/WorkspaceShell'
import { DEFAULT_TONE, PAPER_TONES, type PaperTone } from '@/lib/paper'
import { type PersonaId } from '@/lib/personas'
import { callMuse } from '@/lib/muse-client'
import { initAudio, playMuseArrivalSound } from '@/lib/sound'
import { loadDocument, loadNotes, saveNotes } from '@/lib/storage'
import {
  createNoteClient,
  listNotesClient,
  listVersionsClient,
  readNoteClient,
  saveNoteClient,
  snapshotNoteClient,
} from '@/lib/notes-client'
import { EMPTY_TIPTAP_DOC, type NoteMeta, type NoteRecord, type TiptapDoc, type VersionMeta } from '@/lib/note-types'
import { type MuseNoteData } from '@/lib/types'

export default function Home() {
  const [tone, setTone] = useState<PaperTone>(DEFAULT_TONE)
  const [notes, setNotes] = useState<NoteMeta[]>([])
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const [activeNote, setActiveNote] = useState<NoteRecord | null>(null)
  const [museNotes, setMuseNotes] = useState<MuseNoteData[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [canImportDraft, setCanImportDraft] = useState(false)
  const marginRailRef = useRef<HTMLElement>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function refreshNotes() {
    const nextNotes = await listNotesClient()
    setNotes(nextNotes)
    return nextNotes
  }

  async function openNote(id: string) {
    const note = await readNoteClient(id)
    setActiveNote(note)
    setMuseNotes(note.museNotes)
    setVersions(await listVersionsClient(note.id))
  }

  useEffect(() => {
    async function boot() {
      try {
        const nextNotes = await refreshNotes()
        setCanImportDraft(Boolean(loadDocument()) && nextNotes.length === 0)
        if (nextNotes[0]) await openNote(nextNotes[0].id)
        if (!nextNotes[0]) {
          const created = await createNoteClient('Untitled')
          await refreshNotes()
          await openNote(created.id)
        }
      } catch {
        setSaving('error')
      }
    }
    boot()
  }, [])

  useEffect(() => {
    const tokens = PAPER_TONES[tone]
    const root = document.documentElement
    for (const [key, val] of Object.entries(tokens)) root.style.setProperty(key, val)
  }, [tone])

  useEffect(() => {
    saveNotes(museNotes)
  }, [museNotes])

  function queueSave(nextNote: NoteRecord) {
    setActiveNote(nextNote)
    setSaving('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const saved = await saveNoteClient(nextNote.id, {
          title: nextNote.title,
          content: nextNote.content,
          museNotes,
        })
        setActiveNote(saved)
        setSaving('saved')
        await refreshNotes()
      } catch {
        setSaving('error')
      }
    }, 700)
  }

  function handleTitleChange(title: string) {
    if (!activeNote) return
    queueSave({ ...activeNote, title })
  }

  function handleContentChange(content: TiptapDoc) {
    if (!activeNote) return
    queueSave({ ...activeNote, content })
  }

  async function handleCreateNote() {
    const note = await createNoteClient('Untitled')
    await refreshNotes()
    await openNote(note.id)
  }

  async function handleSnapshot() {
    if (!activeNote) return
    await snapshotNoteClient(activeNote.id)
    setVersions(await listVersionsClient(activeNote.id))
  }

  async function handleImportDraft() {
    const draft = loadDocument()
    if (!draft) return
    const note = await createNoteClient('Imported Draft')
    const imported: NoteRecord = {
      ...note,
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: draft.replace(/<[^>]+>/g, '') }] }],
      },
    }
    await saveNoteClient(imported.id, {
      title: imported.title,
      content: imported.content,
      museNotes: loadNotes(),
    })
    setCanImportDraft(false)
    await refreshNotes()
    await openNote(imported.id)
  }

  function handleSoundChange(v: boolean) {
    setSoundEnabled(v)
    if (v && !audioRef.current) audioRef.current = initAudio()
  }

  const handleMusePick = useCallback(
    async (persona: PersonaId, selectedText: string, contextText: string, anchorViewportTop: number) => {
      if (loading) return
      setLoading(true)
      const railTop = marginRailRef.current?.getBoundingClientRect().top ?? 0
      const anchorTop = Math.max(0, anchorViewportTop - railTop)
      try {
        const result = await callMuse({ text: selectedText, persona, context: contextText })
        if (result.question) {
          setMuseNotes((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              persona,
              question: result.question!,
              anchorTop,
              createdAt: Date.now(),
            },
          ])
          if (soundEnabled && audioRef.current) playMuseArrivalSound(audioRef.current)
        }
      } finally {
        setLoading(false)
      }
    },
    [loading, soundEnabled]
  )

  function dismissNote(id: string) {
    setMuseNotes((prev) => prev.filter((n) => n.id !== id))
  }

  function clearAllNotes() {
    setMuseNotes([])
  }

  const paper = (
    <>
      <div className="paper-header">
        <TitleField title={activeNote?.title ?? ''} onChange={handleTitleChange} />
        <div className="save-state" aria-live="polite">
          {saving === 'saving' ? 'saving...' : saving === 'error' ? 'not saved' : activeNote ? `saved ${new Date(activeNote.updated).toLocaleTimeString()}` : ''}
        </div>
      </div>
      <div className="paper-body">
        <Editor
          contentKey={activeNote?.id ?? null}
          content={activeNote?.content ?? EMPTY_TIPTAP_DOC}
          onContentChange={handleContentChange}
          onMusePick={handleMusePick}
          loading={loading}
          soundEnabled={soundEnabled}
          audioCtx={audioRef.current}
        />
        <MarginRail
          notes={museNotes}
          onDismiss={dismissNote}
          railRef={marginRailRef}
          onClearAll={museNotes.length > 1 ? clearAllNotes : undefined}
        />
      </div>
    </>
  )

  return (
    <WorkspaceShell
      notesPanel={
        <NotesPanel
          notes={notes}
          activeNoteId={activeNote?.id ?? null}
          onSelect={openNote}
          onCreate={handleCreateNote}
          onImportDraft={canImportDraft ? handleImportDraft : undefined}
        />
      }
      versionsPanel={
        <VersionsPanel versions={versions} onSnapshot={handleSnapshot} disabled={!activeNote} />
      }
      paper={paper}
      controls={
        <>
          <PaperToneSwitch tone={tone} onChange={setTone} />
          <SoundToggle enabled={soundEnabled} onChange={handleSoundChange} />
        </>
      }
    />
  )
}
```

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected: build may expose TypeScript issues in the new API/client boundary. Fix only the reported type issues, preserving the design.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm test -- __tests__/notes-client.test.ts __tests__/editor-toolbar.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire local notes into editor"
```

## Task 9: Layered Workspace Styling

**Files:**

- Modify: `app/globals.css`
- Modify: `lib/paper.ts`

- [ ] **Step 1: Increase paper grain by about 25%**

Modify `lib/paper.ts` grain opacities:

```ts
export const PAPER_TONES: Record<PaperTone, PaperToneTokens> = {
  daylight: {
    '--paper-bg': '#f5f2ec',
    '--paper-ink': '#2c2825',
    '--paper-muse-ink': '#6b5e50',
    '--paper-grain-opacity': '0.044',
  },
  cream: {
    '--paper-bg': '#f0ead8',
    '--paper-ink': '#2c2520',
    '--paper-muse-ink': '#7a6a58',
    '--paper-grain-opacity': '0.056',
  },
  candlelight: {
    '--paper-bg': '#e8d9b8',
    '--paper-ink': '#2a2018',
    '--paper-muse-ink': '#8a7260',
    '--paper-grain-opacity': '0.075',
  },
}
```

- [ ] **Step 2: Add layered workspace CSS**

Append to `app/globals.css`:

```css
.workspace-shell {
  position: relative;
  min-height: 100vh;
  padding: 34px clamp(18px, 4vw, 54px);
  overflow-x: hidden;
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.55), transparent 24%),
    radial-gradient(circle at 86% 88%, rgba(74, 54, 38, 0.16), transparent 28%),
    linear-gradient(135deg, color-mix(in srgb, var(--paper-bg) 82%, #c1aa80), #cbb891);
}

.workspace-texture {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.12;
  filter: blur(0.65px);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

.paper-sheet {
  position: relative;
  z-index: 2;
  width: min(760px, calc(100vw - 380px));
  min-height: min(1040px, calc(100vh - 68px));
  margin: 0 auto;
  padding: clamp(34px, 5vw, 64px);
  background: var(--paper-bg);
  box-shadow:
    0 42px 110px rgba(44, 37, 32, 0.28),
    0 10px 28px rgba(44, 37, 32, 0.14),
    inset 0 0 0 1px rgba(255, 255, 255, 0.52);
}

.paper-header {
  margin-bottom: 28px;
}

.title-field {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--paper-ink);
  font-family: var(--font-prose);
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1.05;
  outline: none;
}

.title-field::placeholder {
  color: var(--paper-muse-ink);
  opacity: 0.45;
}

.save-state {
  min-height: 18px;
  margin-top: 10px;
  color: var(--paper-muse-ink);
  font-family: var(--font-muse);
  font-size: 0.72rem;
  opacity: 0.62;
}

.paper-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16rem;
  gap: 2rem;
}

.notes-panel,
.versions-panel {
  position: fixed;
  z-index: 1;
  top: 48px;
  bottom: 52px;
  width: 190px;
  padding: 18px 14px;
  border: 1px solid rgba(80, 60, 43, 0.13);
  border-radius: 12px;
  background: rgba(80, 60, 43, 0.11);
  backdrop-filter: blur(9px);
  color: var(--paper-ink);
  opacity: 0.76;
}

.notes-panel {
  left: 28px;
}

.versions-panel {
  right: 28px;
}

.panel-kicker {
  margin-bottom: 14px;
  color: var(--paper-muse-ink);
  font-family: var(--font-muse);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.panel-action,
.panel-row {
  width: 100%;
  border: 0;
  background: rgba(44, 37, 32, 0.06);
  color: var(--paper-ink);
  font-family: var(--font-muse);
  text-align: left;
}

.panel-action {
  margin-bottom: 8px;
  padding: 8px 9px;
  border-radius: 8px;
  font-size: 0.72rem;
}

.panel-action.subtle {
  opacity: 0.7;
}

.panel-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.panel-row {
  display: grid;
  gap: 4px;
  padding: 9px;
  border-radius: 8px;
  cursor: pointer;
}

.panel-row.active {
  background: rgba(44, 37, 32, 0.14);
}

.panel-row.read-only {
  cursor: default;
}

.panel-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
}

.panel-row time {
  color: var(--paper-muse-ink);
  font-size: 0.62rem;
}

.workspace-controls {
  position: fixed;
  z-index: 5;
  bottom: 16px;
  left: 50%;
  display: flex;
  gap: 12px;
  transform: translateX(-50%);
}

.editor-toolbar-wrap {
  position: sticky;
  top: 18px;
  z-index: 10;
  display: flex;
  justify-content: center;
  height: 0;
}

.editor-toolbar-toggle,
.editor-toolbar button {
  border: 1px solid rgba(44, 37, 32, 0.11);
  color: var(--paper-muse-ink);
  background: rgba(246, 240, 224, 0.82);
}

.editor-toolbar-toggle {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  transform: translateY(-12px);
}

.editor-toolbar {
  position: absolute;
  top: -14px;
  display: flex;
  gap: 7px;
  padding: 6px 10px;
  border: 1px solid rgba(44, 37, 32, 0.12);
  border-radius: 999px;
  background: rgba(246, 240, 224, 0.88);
  box-shadow: 0 12px 28px rgba(44, 37, 32, 0.12);
  animation: toolbar-in 160ms ease both;
}

.editor-toolbar button {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 999px;
  font-family: var(--font-muse);
  font-size: 0.75rem;
}

.editor-toolbar button:disabled {
  opacity: 0.35;
}

@keyframes toolbar-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 980px) {
  .paper-sheet {
    width: min(100%, 720px);
  }

  .paper-body {
    grid-template-columns: 1fr;
  }

  .notes-panel,
  .versions-panel {
    position: static;
    width: auto;
    margin: 0 auto 16px;
  }
}
```

- [ ] **Step 3: Run paper tests and build**

Run:

```bash
npm test -- __tests__/paper.test.ts
npm run build
```

Expected: tests and build PASS. If CSS `color-mix` causes build/runtime concerns, replace the workspace gradient with static warm colors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css lib/paper.ts
git commit -m "style: add focused paper workspace"
```

## Task 10: Documentation And Final Verification

**Files:**

- Modify: `README.md`
- Optional modify: `SECURITY.md`

- [ ] **Step 1: Update README local run notes**

Add this section to `README.md` under "Running it":

```md
## Local Markdown vault

The writing experience saves notes locally as Markdown.

- Default vault: `./notes/`
- Current note: `notes/<title>.md`
- Manual snapshots: `notes/.versions/<note-slug>/<timestamp>.md`

You can point the app at another local folder later with:

```bash
MUSE_VAULT_DIR="/path/to/ObsidianVault/Margin Muse" npm run dev
```

This is intended for trusted local runs. Do not expose the local file API routes publicly.
```

- [ ] **Step 2: Note AI hold**

Add this sentence near the Anthropic setup note:

```md
The local writing, Markdown, rich-text, and versioning features work without an Anthropic key. AI/muse integration remains optional and can be wired in later.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run build
```

Expected:

- `npm test`: all tests PASS.
- `npm run build`: production build PASS.

- [ ] **Step 4: Manual smoke test**

Run:

```bash
npm run dev
```

Open `http://localhost:3000` and verify:

- App loads without Anthropic key.
- A note appears or can be created.
- Title can be edited.
- Rich text toolbar opens from the centered icon.
- Bold, italic, heading, lists, blockquote, undo, and redo work.
- Markdown file appears under `notes/`.
- Clicking "Save version" creates a file under `notes/.versions/<note-slug>/`.
- Reloading the page reopens the saved note.

- [ ] **Step 5: Commit docs**

```bash
git add README.md SECURITY.md
git commit -m "docs: document local markdown vault"
```

## Execution Notes

- Keep commits small and task-aligned.
- Do not run `npm audit fix --force` during this feature.
- Do not modify AI model names, prompts, or Anthropic behavior.
- Do not add public deployment assumptions to local file APIs.
- If tests need filesystem writes, use temporary directories under `os.tmpdir()`.

## Final Acceptance Criteria

- Local writing works without an Anthropic key.
- Notes are real Markdown files under `./notes/`.
- The current note autosaves to its `.md` file.
- Manual snapshots write timestamped Markdown files.
- The editor has usable rich text via shortcuts and a hidden centered toolbar.
- The page visually reads as a focused paper sheet in a lower-contrast layered workspace.
- Existing unit tests pass.
- New markdown, vault, API, client, and toolbar tests pass.
- `npm run build` passes.
