interface Props {
  enabled: boolean
  onChange: (v: boolean) => void
}

export default function SoundToggle({ enabled, onChange }: Props) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{ fontFamily: 'var(--font-muse)', color: 'var(--paper-muse-ink)' }}
      className="text-xs px-2 py-1 opacity-40 hover:opacity-70 transition-opacity"
      title={enabled ? 'Sound on' : 'Sound off'}
      aria-label={enabled ? 'Sound on' : 'Sound off'}
      aria-pressed={enabled}
    >
      {enabled ? '♪' : '♩'}
    </button>
  )
}
