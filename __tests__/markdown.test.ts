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
