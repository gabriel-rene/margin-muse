import { describe, expect, it } from 'vitest'
import {
  buildMarkdownFile,
  markdownToTiptapDoc,
  parseMarkdownFile,
  parseMuseNotesSection,
  slugifyTitle,
  timestampForFilename,
  tiptapDocToMarkdown,
} from '@/lib/markdown'
import { type TiptapDoc } from '@/lib/note-types'

function paragraphDoc(text: string): TiptapDoc {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

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

  it('round-trips literal asterisks and underscores without growing escapes', () => {
    const original = paragraphDoc('price is 5 * 3 and snake_case stays put')
    let doc = original
    // Corruption used to compound with each save/load cycle — run three.
    for (let i = 0; i < 3; i += 1) {
      doc = markdownToTiptapDoc(tiptapDocToMarkdown(doc))
    }
    expect(doc.content?.[0]?.content?.[0]?.text).toBe('price is 5 * 3 and snake_case stays put')
  })

  it('does not read escaped asterisks as emphasis delimiters', () => {
    const doc = markdownToTiptapDoc('a \\* b \\* c')
    const para = doc.content?.[0]
    expect(para?.content).toHaveLength(1)
    expect(para?.content?.[0]?.text).toBe('a * b * c')
    expect(para?.content?.[0]?.marks).toBeUndefined()
  })

  it('still round-trips real emphasis', () => {
    const doc = markdownToTiptapDoc(tiptapDocToMarkdown({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'both ' },
            { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
          ],
        },
      ],
    }))
    const para = doc.content?.[0]
    expect(para?.content?.[1]).toEqual({ type: 'text', text: 'bold', marks: [{ type: 'bold' }] })
    expect(para?.content?.[3]).toEqual({ type: 'text', text: 'italic', marks: [{ type: 'italic' }] })
  })

  it('round-trips titles that need YAML quoting', () => {
    const markdown = buildMarkdownFile({
      meta: {
        id: 'note-1',
        title: 'Drafts: the "final" cut',
        slug: 'drafts-the-final-cut',
        filename: 'drafts-the-final-cut.md',
        created: '2026-06-29T13:00:00.000Z',
        updated: '2026-06-29T13:05:00.000Z',
      },
      body: 'Body.',
      museNotes: [],
    })
    const parsed = parseMarkdownFile(markdown, 'drafts-the-final-cut.md')
    expect(parsed.meta.title).toBe('Drafts: the "final" cut')
  })
})

describe('muse notes section', () => {
  it('round-trips muse notes through the markdown file', () => {
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
      museNotes: [
        {
          id: 'a',
          persona: 'skeptic',
          question: 'What backs this claim?',
          anchorTop: 120,
          createdAt: Date.parse('2026-06-29T13:04:00.000Z'),
        },
        {
          id: 'b',
          persona: 'reader',
          question: 'Who is "we" here?',
          anchorTop: 300,
          createdAt: Date.parse('2026-06-29T13:05:00.000Z'),
        },
      ],
    })

    const parsed = parseMarkdownFile(markdown, 'my-note.md')
    const restored = parseMuseNotesSection(parsed.body)
    expect(restored).toHaveLength(2)
    expect(restored[0].persona).toBe('skeptic')
    expect(restored[0].question).toBe('What backs this claim?')
    expect(restored[0].createdAt).toBe(Date.parse('2026-06-29T13:04:00.000Z'))
    expect(restored[1].persona).toBe('reader')
    expect(restored[1].question).toBe('Who is "we" here?')
    // Restored notes stack down the rail in order.
    expect(restored[1].anchorTop).toBeGreaterThan(restored[0].anchorTop)
  })

  it('returns empty for bodies without a muse section and skips unknown personas', () => {
    expect(parseMuseNotesSection('Just prose.')).toEqual([])
    const section = '<!-- muse-notes -->\n\n## Muse Notes\n\n### 2026-06-29 13:04 - impostor\n\n> Fake?'
    expect(parseMuseNotesSection(`Body.\n\n${section}`)).toEqual([])
  })
})
