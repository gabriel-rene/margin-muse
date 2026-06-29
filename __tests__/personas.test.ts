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

  it('each system prompt instructs to return one question or null', () => {
    for (const id of IDS) {
      const p = PERSONAS[id].systemPrompt.toLowerCase()
      expect(p).toMatch(/one question|null/)
    }
  })
})
