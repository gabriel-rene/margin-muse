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
            const currentPos = $from.before($from.depth > 0 ? $from.depth : 1)
            const decorations: Decoration[] = []

            newState.doc.forEach((node, offset) => {
              if (node.type.name !== 'paragraph') return

              const distance = Math.abs(offset - currentPos)
              let focus: string

              if (distance === 0) {
                focus = 'current'
              } else if (distance <= 200) {
                focus = 'near'
              } else {
                focus = 'far'
              }

              decorations.push(
                Decoration.node(offset, offset + node.nodeSize, {
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
