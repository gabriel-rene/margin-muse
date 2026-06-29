let _ctx: AudioContext | null = null

/**
 * Lazily create (or return) the shared AudioContext.
 * Must be called after a user gesture — browsers block AudioContext
 * construction before any interaction.
 */
export function initAudio(): AudioContext {
  if (!_ctx) {
    _ctx = new AudioContext()
  }
  return _ctx
}

function jitter(base: number, range: number): number {
  return base + (Math.random() - 0.5) * range
}

/**
 * Soft wood-and-felt typing click.
 * Low-frequency sine with short decay and random pitch jitter so it
 * never feels robotic or mechanical.
 */
export function playTypingSound(ctx: AudioContext): void {
  const now = ctx.currentTime

  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(jitter(0.04, 0.02), now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)

  const osc = ctx.createOscillator()
  osc.connect(gain)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(jitter(180, 40), now)
  osc.frequency.exponentialRampToValueAtTime(jitter(100, 20), now + 0.06)
  osc.start(now)
  osc.stop(now + 0.09)
}

/**
 * Gentler, higher arrival chime for when the muse speaks.
 * Distinct from typing: higher base frequency, longer envelope — the
 * writer hears it without needing to look up.
 */
export function playMuseArrivalSound(ctx: AudioContext): void {
  const now = ctx.currentTime

  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.06, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)

  const osc = ctx.createOscillator()
  osc.connect(gain)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(jitter(520, 20), now)
  osc.frequency.exponentialRampToValueAtTime(jitter(440, 10), now + 0.5)
  osc.start(now)
  osc.stop(now + 0.65)
}
