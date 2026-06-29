import { describe, it, expect } from 'vitest'
import { PAPER_TONES, type PaperTone } from '@/lib/paper'

describe('PAPER_TONES', () => {
  const tones: PaperTone[] = ['daylight', 'cream', 'candlelight']

  it('defines all three tones', () => {
    for (const t of tones) {
      expect(PAPER_TONES[t]).toBeDefined()
    }
  })

  it('each tone has all required CSS variable keys', () => {
    const required = ['--paper-bg', '--paper-ink', '--paper-muse-ink', '--paper-grain-opacity']
    for (const t of tones) {
      for (const key of required) {
        expect(PAPER_TONES[t]).toHaveProperty(key)
      }
    }
  })

  it('candlelight bg is a warm sepia, not pure white', () => {
    expect(PAPER_TONES.candlelight['--paper-bg']).not.toBe('#ffffff')
    expect(PAPER_TONES.candlelight['--paper-bg']).not.toBe('#fff')
  })

  it('no tone uses pure black ink', () => {
    for (const t of tones) {
      expect(PAPER_TONES[t]['--paper-ink']).not.toBe('#000000')
      expect(PAPER_TONES[t]['--paper-ink']).not.toBe('#000')
    }
  })
})
