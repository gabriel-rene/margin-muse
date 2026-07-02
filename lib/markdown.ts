import MarkdownIt from 'markdown-it'
import { EMPTY_TIPTAP_DOC, type NoteMeta, type TiptapDoc, type TiptapMark, type TiptapNode } from '@/lib/note-types'
import { PERSONAS, type PersonaId } from '@/lib/personas'
import { type MuseNoteData } from '@/lib/types'

export const MUSE_NOTES_MARKER = '<!-- muse-notes -->'

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

function unescapeYamlValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value)
    } catch {
      return value.replace(/^"|"$/g, '')
    }
  }
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

function unescapeMarkdownText(value: string): string {
  return value.replace(/\\([\\*_])/g, '$1')
}

function textNode(text: string, marks?: TiptapMark[]): TiptapNode {
  const unescaped = unescapeMarkdownText(text)
  return marks?.length ? { type: 'text', text: unescaped, marks } : { type: 'text', text: unescaped }
}

function inlineMarkdownToNodes(text: string): TiptapNode[] {
  const nodes: TiptapNode[] = []
  const pattern = /((?<!\\)\*\*([^*]+?)(?<!\\)\*\*|(?<!\\)\*([^*]+?)(?<!\\)\*|\[([^\]]+)\]\(([^)]+)\))/g
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
  return nodes.length ? nodes : [textNode(text)]
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
      .map((line) => [line[1].trim(), unescapeYamlValue(line[2].trim())])
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

/**
 * Space multiple restored notes down the rail. The original pixel anchor is a
 * frozen viewport measurement that can't be reconstructed from the file, so
 * restored notes stack top-down in creation order instead.
 */
const RESTORED_NOTE_GAP = 96

export function parseMuseNotesSection(body: string): MuseNoteData[] {
  const markerIndex = body.indexOf(MUSE_NOTES_MARKER)
  if (markerIndex === -1) return []
  const section = body.slice(markerIndex)
  const notes: MuseNoteData[] = []
  const entryPattern = /^### (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) - (\S+)\n+((?:> .*(?:\n|$))+)/gm
  let match: RegExpExecArray | null
  while ((match = entryPattern.exec(section))) {
    const persona = match[2]
    if (!(persona in PERSONAS)) continue
    const question = match[3]
      .split('\n')
      .map((line) => line.replace(/^> ?/, '').trim())
      .filter(Boolean)
      .join(' ')
    if (!question) continue
    const createdAt = Date.parse(`${match[1].replace(' ', 'T')}:00.000Z`)
    notes.push({
      id: crypto.randomUUID(),
      persona: persona as PersonaId,
      question,
      anchorTop: notes.length * RESTORED_NOTE_GAP,
      createdAt: Number.isNaN(createdAt) ? Date.now() : createdAt,
    })
  }
  return notes
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
    ? `\n\n${MUSE_NOTES_MARKER}\n\n## Muse Notes\n\n${museNotes
        .map((note) => {
          const created = new Date(note.createdAt).toISOString().replace('T', ' ').slice(0, 16)
          return `### ${created} - ${note.persona}\n\n> ${note.question}`
        })
        .join('\n\n')}`
    : ''
  return `${frontmatter}${titleHeading}\n\n${body.trim()}${museSection}\n`
}
