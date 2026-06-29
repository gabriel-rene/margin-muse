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
    '--paper-ink': '#2c2825',
    '--paper-muse-ink': '#6b5e50',
    '--paper-grain-opacity': '0.044',
  },
  cream: {
    '--paper-bg': '#f0ead8',
    '--paper-ink': '#2c2520',
    '--paper-muse-ink': '#7a6a58',
    '--paper-grain-opacity': '0.056',
  },
  candlelight: {
    '--paper-bg': '#e8d9b8',
    '--paper-ink': '#2a2018',
    '--paper-muse-ink': '#8a7260',
    '--paper-grain-opacity': '0.075',
  },
}

export const DEFAULT_TONE: PaperTone = 'cream'
