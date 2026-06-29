import { describe, it, expect, beforeEach } from 'vitest'

// jsdom provides localStorage
beforeEach(() => {
  localStorage.clear()
})

import { saveDocument, loadDocument, saveNotes, loadNotes } from '@/lib/storage'
import { type MuseNoteData } from '@/lib/types'

describe('document persistence', () => {
  it('loadDocument returns null when nothing saved', () => {
    expect(loadDocument()).toBeNull()
  })

  it('saves and loads document content', () => {
    saveDocument('Hello world')
    expect(loadDocument()).toBe('Hello world')
  })

  it('overwrites previous document', () => {
    saveDocument('first')
    saveDocument('second')
    expect(loadDocument()).toBe('second')
  })
})

describe('notes persistence', () => {
  it('loadNotes returns empty array when nothing saved', () => {
    expect(loadNotes()).toEqual([])
  })

  it('saves and loads notes', () => {
    const notes: MuseNoteData[] = [
      { id: '1', persona: 'skeptic', question: 'Why?', anchorTop: 100, createdAt: 1000 },
    ]
    saveNotes(notes)
    expect(loadNotes()).toEqual(notes)
  })

  it('returns empty array when stored JSON is invalid', () => {
    localStorage.setItem('muse:notes', 'not-json{{{')
    expect(loadNotes()).toEqual([])
  })
})
