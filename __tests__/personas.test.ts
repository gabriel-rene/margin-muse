import { describe, it, expect } from 'vitest'
import { PERSONAS, type PersonaId } from '@/lib/personas'

const IDS: PersonaId[] = ['skeptic', 'reader', 'cd']

describe('PERSONAS', () => {
  it('defines all three personas', () => {
    for (const id of IDS) {
      expect(PERSONAS[id]).toBeDefined()
    }
  })

  it('each persona has a non-empty system prompt', () => {
    for (const id of IDS) {
      expect(PERSONAS[id].systemPrompt.length).toBeGreaterThan(50)
    }
  })

  it('no system prompt contains "try:" or "consider writing:"', () => {
    for (const id of IDS) {
      const p = PERSONAS[id].systemPrompt.toLowerCase()
      expect(p).not.toContain('try:')
      expect(p).not.toContain('consider writing:')
    }
  })

  it('each system prompt instructs to return exactly one question AND offers the null path', () => {
    for (const id of IDS) {
      const p = PERSONAS[id].systemPrompt.toLowerCase()
      // Both halves of the contract must be present independently — a prompt
      // that only said "one question" without the null escape would be wrong.
      expect(p).toContain('one question')
      expect(p).toContain('null')
    }
  })

  it('each system prompt forbids rewriting the prose (product identity)', () => {
    for (const id of IDS) {
      const p = PERSONAS[id].systemPrompt.toLowerCase()
      expect(p).toContain('do not rewrite')
    }
  })
})
