'use client'

import { useEffect, useRef, useState } from 'react'
import { type Editor as TiptapEditor } from '@tiptap/react'

interface Props {
  editor: TiptapEditor | null
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export default function EditorToolbar({ editor, canUndo, canRedo, onUndo, onRedo }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function run(command: () => void) {
    command()
    editor?.commands.focus()
  }

  return (
    <div ref={ref} className="editor-toolbar-wrap">
      <button
        type="button"
        className="editor-toolbar-toggle"
        aria-label={open ? 'Hide formatting toolbar' : 'Show formatting toolbar'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ✦
      </button>
      {open && (
        <div className="editor-toolbar" role="toolbar" aria-label="Formatting toolbar">
          <button type="button" aria-label="Bold" onClick={() => run(() => editor?.chain().focus().toggleBold().run())}>
            B
          </button>
          <button type="button" aria-label="Italic" onClick={() => run(() => editor?.chain().focus().toggleItalic().run())}>
            <em>I</em>
          </button>
          <button type="button" aria-label="Heading" onClick={() => run(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())}>
            H
          </button>
          <button type="button" aria-label="Bullet list" onClick={() => run(() => editor?.chain().focus().toggleBulletList().run())}>
            •
          </button>
          <button type="button" aria-label="Ordered list" onClick={() => run(() => editor?.chain().focus().toggleOrderedList().run())}>
            1
          </button>
          <button type="button" aria-label="Blockquote" onClick={() => run(() => editor?.chain().focus().toggleBlockquote().run())}>
            "
          </button>
          <button type="button" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
            ↶
          </button>
          <button type="button" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
            ↷
          </button>
        </div>
      )}
    </div>
  )
}
