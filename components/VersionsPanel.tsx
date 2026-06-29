'use client'

import { type VersionMeta } from '@/lib/note-types'

interface Props {
  versions: VersionMeta[]
  onSnapshot: () => void
  disabled?: boolean
}

export default function VersionsPanel({ versions, onSnapshot, disabled = false }: Props) {
  return (
    <aside className="versions-panel" aria-label="Versions">
      <div className="panel-kicker">Versions</div>
      <button type="button" className="panel-action" disabled={disabled} onClick={onSnapshot}>
        Save version
      </button>
      <div className="panel-list">
        {versions.map((version) => (
          <div key={version.id} className="panel-row read-only">
            <span>{version.title}</span>
            <time>{new Date(version.created).toLocaleString()}</time>
          </div>
        ))}
      </div>
    </aside>
  )
}
