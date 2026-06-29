'use client'

import { type ReactNode } from 'react'

interface Props {
  sidebar: ReactNode
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onCloseSidebar: () => void
  paper: ReactNode
  controls: ReactNode
}

export default function WorkspaceShell({ sidebar, sidebarOpen, onToggleSidebar, paper, controls }: Props) {
  return (
    <main className="workspace-shell">
      <div className="workspace-texture" aria-hidden="true" />
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Close notes' : 'Open notes'}
        aria-expanded={sidebarOpen}
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
          <rect x="0" y="0" width="4" height="12" rx="1" />
          <rect x="7" y="0" width="9" height="2" rx="1" />
          <rect x="7" y="5" width="9" height="2" rx="1" />
          <rect x="7" y="10" width="9" height="2" rx="1" />
        </svg>
      </button>
      <aside
        className={`notes-sidebar${sidebarOpen ? ' open' : ''}`}
        aria-label="Notes"
        aria-hidden={!sidebarOpen}
      >
        <div className="sidebar-inner">
          {sidebar}
        </div>
      </aside>
      <section className="writing-area" aria-label="Writing surface">
        {paper}
      </section>
      <div className="workspace-controls">{controls}</div>
    </main>
  )
}
