'use client'

import { type ReactNode } from 'react'

interface Props {
  notesPanel: ReactNode
  versionsPanel: ReactNode
  paper: ReactNode
  controls: ReactNode
}

export default function WorkspaceShell({ notesPanel, versionsPanel, paper, controls }: Props) {
  return (
    <main className="workspace-shell">
      <div className="workspace-texture" aria-hidden="true" />
      {notesPanel}
      <section className="paper-sheet" aria-label="Writing surface">
        {paper}
      </section>
      {versionsPanel}
      <div className="workspace-controls">{controls}</div>
    </main>
  )
}
