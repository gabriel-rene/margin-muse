export type PaperTone = 'daylight' | 'cream' | 'candlelight'

export interface PaperToneTokens {
  '--paper-bg': string
  '--paper-ink': string
  '--paper-muse-ink': string
  '--paper-grain-opacity': string
}

export const PAPER_TONES: Record<PaperTone, PaperToneTokens> = {
  daylight: {
    '--paper-bg': '#f5f2ec',
    '--paper-ink': '#2b2927',
    '--paper-muse-ink': '#665e58',
    '--paper-grain-opacity': '0.09',
  },
  cream: {
    '--paper-bg': '#f0ead8',
    '--paper-ink': '#2c2826',
    '--paper-muse-ink': '#6f6660',
    '--paper-grain-opacity': '0.11',
  },
  candlelight: {
    '--paper-bg': '#e8d9b8',
    '--paper-ink': '#2b2820',
    '--paper-muse-ink': '#7a7068',
    '--paper-grain-opacity': '0.14',
  },
}

export const DEFAULT_TONE: PaperTone = 'cream'
