'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { FocusDepthExtension } from '@/lib/focus-extension'
import MusePicker from '@/components/MusePicker'
import { type PersonaId } from '@/lib/personas'
import { initAudio, playTypingSound } from '@/lib/sound'

interface Props {
  onMusePick?: (persona: PersonaId, selectedText: string, contextText: string, anchorViewportTop: number) => void
  loading?: boolean
  soundEnabled?: boolean
}

export default function Editor({ onMusePick, loading = false, soundEnabled = false }: Props) {
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (soundEnabled && !audioRef.current) {
      audioRef.current = initAudio()
    }
  }, [soundEnabled])

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
    content: '',
    onSelectionUpdate: handleSelectionUpdate,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[60vh]',
      },
      handleKeyDown: () => {
        if (soundEnabled && audioRef.current) {
          playTypingSound(audioRef.current)
        }
        return false // don't intercept the key
      },
    },
  })

  function handlePick(persona: PersonaId) {
    if (!pickerRect) return
    // Pass raw viewport top — page.tsx converts to rail-relative offset
    const anchorViewportTop = pickerRect.top
    setPickerRect(null)
    const context = editor?.getText() ?? ''
    onMusePick?.(persona, selectedText, context, anchorViewportTop)
  }

  return (
    <div className="editor-wrap relative">
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
        <MusePicker
          anchorRect={pickerRect}
          onPick={handlePick}
          onClose={() => setPickerRect(null)}
        />
      )}
    </div>
  )
}
