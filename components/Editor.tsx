'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { FocusDepthExtension } from '@/lib/focus-extension'

export default function Editor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Begin writing…' }),
      FocusDepthExtension,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[60vh]',
      },
    },
  })

  return (
    <div className="editor-wrap">
      <EditorContent editor={editor} />
    </div>
  )
}
