import { describe, it, expect } from 'vitest'
import { validateMuseOutput } from '@/lib/muse-validation'

describe('validateMuseOutput', () => {
  it('returns null for blank input', () => {
    expect(validateMuseOutput('')).toBeNull()
    expect(validateMuseOutput('   ')).toBeNull()
  })

  it('returns null when output is the word "null"', () => {
    expect(validateMuseOutput('null')).toBeNull()
    expect(validateMuseOutput('Null')).toBeNull()
    expect(validateMuseOutput('NULL')).toBeNull()
  })

  it('returns null when output contains "try:"', () => {
    expect(validateMuseOutput('Try: rewriting this sentence more clearly.')).toBeNull()
    expect(validateMuseOutput('What if you try: using simpler words?')).toBeNull()
  })

  it('returns null when output contains "consider writing:"', () => {
    expect(validateMuseOutput('Consider writing: a shorter opening.')).toBeNull()
  })

  it('returns null when output contains a quoted replacement sentence', () => {
    // Pattern: quoted text after a verb of suggestion
    expect(validateMuseOutput('You could say "The data supports this claim."')).toBeNull()
  })

  it('returns null when output is more than two sentences', () => {
    const long = 'Is this claim supported? Where does the evidence come from? Have you considered the counterargument as well?'
    expect(validateMuseOutput(long)).toBeNull()
  })

  it('returns the question for valid single-question output', () => {
    const q = 'What evidence would make this claim feel undeniable?'
    expect(validateMuseOutput(q)).toBe(q)
  })

  it('returns the question for valid two-sentence output', () => {
    const q = 'What does "clear" mean here? Clear to whom, exactly?'
    expect(validateMuseOutput(q)).toBe(q)
  })

  it('strips surrounding whitespace', () => {
    const q = '  What backs this assertion?  '
    expect(validateMuseOutput(q)).toBe('What backs this assertion?')
  })
})
