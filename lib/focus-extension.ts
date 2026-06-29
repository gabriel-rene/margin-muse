import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const focusKey = new PluginKey('focusDepth')

export const FocusDepthExtension = Extension.create({
  name: 'focusDepth',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: focusKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, _old, _oldState, newState) {
            if (!tr.docChanged && !tr.selectionSet) return _old

            const { $from } = newState.selection
            // Position of the top-level block containing the cursor. Depth 1
            // is always the direct child of the doc root (paragraph, list,
            // heading…), so before(1) gives the block's start offset — which
            // matches the offsets doc.forEach yields. Using $from.depth here
            // instead would point at the innermost nested node and never
            // match a top-level offset (lists/blockquotes would break).
            // Fall back to the raw position for depth-0 selections.
            const currentBlockPos = $from.depth >= 1 ? $from.before(1) : $from.pos

            // First pass: index every top-level block, locate the cursor's.
            const blocks: { pos: number; size: number; isParagraph: boolean }[] = []
            let currentIndex = -1
            newState.doc.forEach((node, offset) => {
              if (offset === currentBlockPos) currentIndex = blocks.length
              blocks.push({
                pos: offset,
                size: node.nodeSize,
                isParagraph: node.type.name === 'paragraph',
              })
            })

            // Second pass: classify paragraphs by paragraph-distance (block
            // index), not character distance, so adjacent paragraphs read as
            // "near" regardless of length — the spec's "1–2 away are softer".
            const decorations: Decoration[] = []
            blocks.forEach((block, index) => {
              if (!block.isParagraph) return

              const distance =
                currentIndex === -1 ? Infinity : Math.abs(index - currentIndex)
              const focus =
                distance === 0 ? 'current' : distance <= 2 ? 'near' : 'far'

              decorations.push(
                Decoration.node(block.pos, block.pos + block.size, {
                  'data-focus': focus,
                })
              )
            })

            return DecorationSet.create(newState.doc, decorations)
          },
        },
        props: {
          decorations(state) {
            return focusKey.getState(state)
          },
        },
      }),
    ]
  },
})
