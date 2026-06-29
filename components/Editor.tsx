'use client'

import { useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { FocusDepthExtension } from '@/lib/focus-extension'
import MusePicker from '@/components/MusePicker'
import { type PersonaId } from '@/lib/personas'

interface Props {
  onMusePick?: (persona: PersonaId, selectedText: string, contextText: string) => void
}

export default function Editor({ onMusePick }: Props) {
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null)
  const [selectedText, setSelectedText] = useState('')

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
    },
  })

  function handlePick(persona: PersonaId) {
    setPickerRect(null)
    const context = editor?.getText() ?? ''
    onMusePick?.(persona, selectedText, context)
  }

  return (
    <div className="editor-wrap relative">
      <EditorContent editor={editor} />
      {pickerRect && (
        <MusePicker
          anchorRect={pickerRect}
          onPick={handlePick}
          onClose={() => setPickerRect(null)}
        />
      )}
    </div>
  )
}
