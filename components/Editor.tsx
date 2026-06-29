'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { FocusDepthExtension } from '@/lib/focus-extension'
import MusePicker from '@/components/MusePicker'
import EditorToolbar from '@/components/EditorToolbar'
import { type PersonaId } from '@/lib/personas'
import { playTypingSound } from '@/lib/sound'
import { EMPTY_TIPTAP_DOC, type TiptapDoc } from '@/lib/note-types'

interface Props {
  contentKey: string | null
  content: TiptapDoc | null
  onContentChange: (content: TiptapDoc) => void
  onMusePick?: (persona: PersonaId, selectedText: string, contextText: string, anchorViewportTop: number) => void
  loading?: boolean
  soundEnabled?: boolean
  audioCtx?: AudioContext | null
}

export default function Editor({
  contentKey,
  content,
  onContentChange,
  onMusePick,
  loading = false,
  soundEnabled = false,
  audioCtx = null,
}: Props) {
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [historyTick, setHistoryTick] = useState(0)
  const applyingExternalContent = useRef(false)
  const lastContentKey = useRef<string | null>(null)

  const handleSelectionUpdate = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.toString().trim().length < 3) {
      setPickerRect(null)
      return
    }
    const range = sel.getRangeAt(0)
    setSelectedText(sel.toString().trim())
    setPickerRect(range.getBoundingClientRect())
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Begin writing…' }),
      FocusDepthExtension,
    ],
    content: content ?? EMPTY_TIPTAP_DOC,
    onSelectionUpdate: handleSelectionUpdate,
    onUpdate: ({ editor: e }) => {
      setHistoryTick((value) => value + 1)
      if (!applyingExternalContent.current) {
        onContentChange(e.getJSON() as TiptapDoc)
      }
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[60vh]',
      },
      handleKeyDown: (_view, event) => {
        if (soundEnabled && audioCtx && event.key.length === 1) {
          playTypingSound(audioCtx)
        }
        return false
      },
    },
  })

  useEffect(() => {
    if (!editor || !content) return
    if (lastContentKey.current === contentKey) return
    lastContentKey.current = contentKey
    applyingExternalContent.current = true
    editor.commands.setContent(content, false)
    applyingExternalContent.current = false
  }, [content, contentKey, editor])

  function handlePick(persona: PersonaId) {
    if (!pickerRect) return
    const anchorViewportTop = pickerRect.top
    setPickerRect(null)
    const context = editor?.getText() ?? ''
    onMusePick?.(persona, selectedText, context, anchorViewportTop)
  }

  return (
    <div className="editor-wrap relative">
      <EditorToolbar
        editor={editor}
        canUndo={historyTick >= 0 && Boolean(editor?.can().undo())}
        canRedo={historyTick >= 0 && Boolean(editor?.can().redo())}
        onUndo={() => editor?.chain().focus().undo().run()}
        onRedo={() => editor?.chain().focus().redo().run()}
      />
      {loading && (
        <div
          style={{ fontFamily: 'var(--font-muse)', color: 'var(--paper-muse-ink)' }}
          className="absolute top-0 right-0 text-xs opacity-50 animate-pulse"
        >
          thinking…
        </div>
      )}
      <EditorContent editor={editor} />
      {pickerRect && !loading && (
        <MusePicker anchorRect={pickerRect} onPick={handlePick} onClose={() => setPickerRect(null)} />
      )}
    </div>
  )
}
