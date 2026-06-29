import { describe, it, expect, vi } from 'vitest'

// Mock Web Audio API
const mockConnect = vi.fn()
const mockStart = vi.fn()
const mockStop = vi.fn()

const mockOscillator = {
  connect: mockConnect,
  start: mockStart,
  stop: mockStop,
  frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  type: 'sine',
}

const mockGain = {
  connect: mockConnect,
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
}

const mockCtx = {
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGain),
  destination: {},
  currentTime: 0,
}

vi.stubGlobal('AudioContext', vi.fn(function () { return mockCtx }))

import { initAudio, playTypingSound, playMuseArrivalSound } from '@/lib/sound'

describe('sound.ts', () => {
  it('initAudio returns an AudioContext', () => {
    const ctx = initAudio()
    expect(ctx).toBeDefined()
  })

  it('playTypingSound does not throw', () => {
    const ctx = initAudio()
    expect(() => playTypingSound(ctx as unknown as AudioContext)).not.toThrow()
  })

  it('playMuseArrivalSound does not throw', () => {
    const ctx = initAudio()
    expect(() => playMuseArrivalSound(ctx as unknown as AudioContext)).not.toThrow()
  })

  it('playTypingSound and playMuseArrivalSound use different base frequencies', () => {
    const ctx = initAudio()
    // Reset call tracking
    mockOscillator.frequency.setValueAtTime.mockClear()

    playTypingSound(ctx as unknown as AudioContext)
    const typingFreq = mockOscillator.frequency.setValueAtTime.mock.calls[0]?.[0]

    mockOscillator.frequency.setValueAtTime.mockClear()
    playMuseArrivalSound(ctx as unknown as AudioContext)
    const museFreq = mockOscillator.frequency.setValueAtTime.mock.calls[0]?.[0]

    expect(typingFreq).not.toEqual(museFreq)
  })
})
