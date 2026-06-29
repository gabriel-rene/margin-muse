import { type PaperTone } from '@/lib/paper'

interface Props {
  tone: PaperTone
  onChange: (tone: PaperTone) => void
}

const LABELS: Record<PaperTone, string> = {
  daylight: 'Day',
  cream: 'Cream',
  candlelight: 'Candle',
}

export default function PaperToneSwitch({ tone, onChange }: Props) {
  const tones: PaperTone[] = ['daylight', 'cream', 'candlelight']
  return (
    <div className="flex gap-1 text-xs" style={{ fontFamily: 'var(--font-muse)' }}>
      {tones.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-2 py-1 rounded transition-opacity ${
            tone === t ? 'opacity-100 font-semibold' : 'opacity-40 hover:opacity-70'
          }`}
          style={{ color: 'var(--paper-ink)' }}
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  )
}
