# Margin Muse v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a paper-textured prose editor where writers select text and pull one of three AI personas to receive a single anchored question in the margin — never rewritten copy.

**Architecture:** Next.js App Router shell with a two-column layout (Tiptap editor left, MarginRail right). All AI calls go through a server-side `/api/muse` route that holds the Anthropic key. Notes are stored in component state and persisted to localStorage; no database.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Tiptap (ProseMirror), Anthropic SDK (`@anthropic-ai/sdk`), Web Audio API, Vitest + @testing-library/react

## Global Constraints

- Model: `claude-sonnet-4-6` — hardcoded, never configurable by user
- API key: server-side only (`ANTHROPIC_API_KEY` env var), never sent to client
- No dark mode. Night is served by "Candlelight" paper tone (dim warm sepia), not white-on-black
- No `<audio>` tags — Web Audio API only for sound
- No database through v1 — document and notes persist in localStorage
- Muse never rewrites, suggests replacement sentences, autocompletes, or generates draft text
- Every AI action is pull-initiated (user selects + clicks) — no auto-firing, no debounce-on-type
- Tiptap (ProseMirror) required for the editor — no raw contenteditable, no CodeMirror
- Focus depth effect: per-paragraph, not per visual line

---

## File Map

```
muse-write/
├── app/
│   ├── layout.tsx                  root layout, loads fonts
│   ├── page.tsx                    two-column shell (Editor + MarginRail)
│   ├── globals.css                 Tailwind directives + CSS custom props for paper tones
│   └── api/
│       └── muse/
│           └── route.ts            POST /api/muse — Anthropic call, validation, response
├── components/
│   ├── Editor.tsx                  Tiptap instance, selection detection, focus depth deco
│   ├── MarginRail.tsx              right column, receives + renders MuseNote list
│   ├── MuseNote.tsx                one anchored question card, dismissible
│   ├── MusePicker.tsx              selection popover — three persona buttons
│   ├── PaperToneSwitch.tsx         daylight / cream / candlelight toggle
│   └── SoundToggle.tsx             on/off toggle; calls sound.ts
├── lib/
│   ├── paper.ts                    paper tone CSS variable maps + TypeScript types
│   ├── personas.ts                 three persona definitions + system prompts
│   ├── muse-client.ts              client fetch wrapper for POST /api/muse
│   ├── muse-validation.ts          output guard — rejects replacement copy or overlong output
│   ├── sound.ts                    Web Audio engine (typing + muse-arrival sounds)
│   └── storage.ts                  localStorage read/write for document + notes
└── __tests__/
    ├── paper.test.ts
    ├── personas.test.ts
    ├── muse-validation.test.ts
    ├── muse-client.test.ts
    ├── sound.test.ts
    └── storage.test.ts
```

---

### Task 1: Project scaffold + two-column shell

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs` (via create-next-app)
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/page.tsx`
- Create: `components/Editor.tsx`
- Create: `components/MarginRail.tsx`

**Interfaces:**
- Produces: `<Editor />` — no props for now, renders Tiptap in a div
- Produces: `<MarginRail />` — no props for now, renders an empty aside

- [ ] **Step 1: Scaffold Next.js app**

Run from the parent directory (one level above `muse-write`):
```bash
cd "/Users/gabriel.rodriguez.air/Library/Mobile Documents/com~apple~CloudDocs/gabo/personal"
npx create-next-app@14 muse-write --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```
When prompted, accept all defaults. This overwrites the existing directory but preserves `MARGIN_MUSE_ROADMAP.md` and `docs/`.

- [ ] **Step 2: Install Tiptap and Anthropic SDK**

```bash
cd "/Users/gabriel.rodriguez.air/Library/Mobile Documents/com~apple~CloudDocs/gabo/personal/muse-write"
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder
npm install @anthropic-ai/sdk
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Add `.env.local`**

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Add `.env.local` to `.gitignore` (create-next-app does this already — verify it's there).

- [ ] **Step 5: Write Editor.tsx**

```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

export default function Editor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Begin writing…' }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[60vh]',
      },
    },
  })

  return (
    <div className="editor-wrap">
      <EditorContent editor={editor} />
    </div>
  )
}
```

- [ ] **Step 6: Write MarginRail.tsx**

```tsx
export default function MarginRail() {
  return (
    <aside className="margin-rail w-72 shrink-0 relative">
      {/* Notes render here in later tasks */}
    </aside>
  )
}
```

- [ ] **Step 7: Write app/page.tsx**

```tsx
import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'

export default function Home() {
  return (
    <main className="flex min-h-screen gap-8 px-8 py-12 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <Editor />
      </div>
      <MarginRail />
    </main>
  )
}
```

- [ ] **Step 8: Write app/layout.tsx with Google Fonts**

```tsx
import type { Metadata } from 'next'
import { EB_Garamond, Inter } from 'next/font/google'
import './globals.css'

const garamond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-prose',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-muse',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Margin Muse',
  description: 'A writing editor where AI augments thinking.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 9: Verify it runs**

```bash
npm run dev
```

Open `http://localhost:3000`. You should see a blank page with a text cursor. Type a few words. Expected: text appears, no errors in console.

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js app with Tiptap editor and two-column shell"
```

---

### Task 2: Paper surface

**Files:**
- Create: `lib/paper.ts`
- Create: `components/PaperToneSwitch.tsx`
- Modify: `app/globals.css`
- Modify: `app/page.tsx` (wrap in paper tone provider context)

**Interfaces:**
- Produces: `PaperTone = 'daylight' | 'cream' | 'candlelight'`
- Produces: `PAPER_TONES: Record<PaperTone, PaperToneTokens>` from `lib/paper.ts`
- Produces: `<PaperToneSwitch tone={PaperTone} onChange={(t: PaperTone) => void} />`

- [ ] **Step 1: Write the failing test for paper.ts**

Create `__tests__/paper.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { PAPER_TONES, type PaperTone } from '@/lib/paper'

describe('PAPER_TONES', () => {
  const tones: PaperTone[] = ['daylight', 'cream', 'candlelight']

  it('defines all three tones', () => {
    for (const t of tones) {
      expect(PAPER_TONES[t]).toBeDefined()
    }
  })

  it('each tone has all required CSS variable keys', () => {
    const required = ['--paper-bg', '--paper-ink', '--paper-muse-ink', '--paper-grain-opacity']
    for (const t of tones) {
      for (const key of required) {
        expect(PAPER_TONES[t]).toHaveProperty(key)
      }
    }
  })

  it('candlelight bg is a warm sepia, not pure white', () => {
    expect(PAPER_TONES.candlelight['--paper-bg']).not.toBe('#ffffff')
    expect(PAPER_TONES.candlelight['--paper-bg']).not.toBe('#fff')
  })

  it('no tone uses pure black ink', () => {
    for (const t of tones) {
      expect(PAPER_TONES[t]['--paper-ink']).not.toBe('#000000')
      expect(PAPER_TONES[t]['--paper-ink']).not.toBe('#000')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- paper
```
Expected: FAIL — `Cannot find module '@/lib/paper'`

- [ ] **Step 3: Write lib/paper.ts**

```typescript
export type PaperTone = 'daylight' | 'cream' | 'candlelight'

export interface PaperToneTokens {
  '--paper-bg': string
  '--paper-ink': string
  '--paper-muse-ink': string
  '--paper-grain-opacity': string
}

export const PAPER_TONES: Record<PaperTone, PaperToneTokens> = {
  daylight: {
    '--paper-bg': '#f5f2ec',
    '--paper-ink': '#2c2825',
    '--paper-muse-ink': '#6b5e50',
    '--paper-grain-opacity': '0.035',
  },
  cream: {
    '--paper-bg': '#f0ead8',
    '--paper-ink': '#2c2520',
    '--paper-muse-ink': '#7a6a58',
    '--paper-grain-opacity': '0.045',
  },
  candlelight: {
    '--paper-bg': '#e8d9b8',
    '--paper-ink': '#2a2018',
    '--paper-muse-ink': '#8a7260',
    '--paper-grain-opacity': '0.06',
  },
}

export const DEFAULT_TONE: PaperTone = 'cream'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- paper
```
Expected: PASS (4 tests)

- [ ] **Step 5: Apply paper CSS to globals.css**

Replace the contents of `app/globals.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --paper-bg: #f0ead8;
  --paper-ink: #2c2520;
  --paper-muse-ink: #7a6a58;
  --paper-grain-opacity: 0.045;
  --font-prose: 'EB Garamond', Georgia, serif;
  --font-muse: 'Inter', system-ui, sans-serif;
}

body {
  background-color: var(--paper-bg);
  color: var(--paper-ink);
  font-family: var(--font-prose);
  transition: background-color 0.4s ease, color 0.2s ease;
}

/* Letterpress depth — static emboss on all prose text */
.editor-wrap .tiptap p,
.editor-wrap .tiptap h1,
.editor-wrap .tiptap h2,
.editor-wrap .tiptap h3 {
  text-shadow:
    0 1px 0 rgba(255,255,255,0.45),
    0 -1px 0 rgba(0,0,0,0.18);
}

/* Paper grain overlay via pseudo-element on body */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999;
  opacity: var(--paper-grain-opacity);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

/* Editor prose typography */
.editor-wrap .tiptap {
  font-family: var(--font-prose);
  font-size: 1.2rem;
  line-height: 1.85;
  color: var(--paper-ink);
}

.editor-wrap .tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--paper-muse-ink);
  opacity: 0.5;
  pointer-events: none;
  height: 0;
}
```

- [ ] **Step 6: Write PaperToneSwitch.tsx**

```tsx
import { type PaperTone } from '@/lib/paper'

interface Props {
  tone: PaperTone
  onChange: (tone: PaperTone) => void
}

const LABELS: Record<PaperTone, string> = {
  daylight: 'Day',
  cream: 'Cream',
  candlelight: 'Candle',
}

export default function PaperToneSwitch({ tone, onChange }: Props) {
  const tones: PaperTone[] = ['daylight', 'cream', 'candlelight']
  return (
    <div className="flex gap-1 text-xs" style={{ fontFamily: 'var(--font-muse)' }}>
      {tones.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-2 py-1 rounded transition-opacity ${
            tone === t ? 'opacity-100 font-semibold' : 'opacity-40 hover:opacity-70'
          }`}
          style={{ color: 'var(--paper-ink)' }}
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Wire tone state in page.tsx**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'
import PaperToneSwitch from '@/components/PaperToneSwitch'
import { PAPER_TONES, DEFAULT_TONE, type PaperTone } from '@/lib/paper'

export default function Home() {
  const [tone, setTone] = useState<PaperTone>(DEFAULT_TONE)

  useEffect(() => {
    const tokens = PAPER_TONES[tone]
    const root = document.documentElement
    for (const [key, val] of Object.entries(tokens)) {
      root.style.setProperty(key, val)
    }
  }, [tone])

  return (
    <main className="flex min-h-screen gap-8 px-8 py-12 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <Editor />
      </div>
      <MarginRail />
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <PaperToneSwitch tone={tone} onChange={setTone} />
      </div>
    </main>
  )
}
```

- [ ] **Step 8: Verify visually**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- Background is warm cream (not white)
- Text is warm near-black (not pure black)
- Grain texture visible over the background (subtle)
- Typing shows letterpress shadow under each letter
- Clicking Day / Cream / Candle visibly shifts the background warmth

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: paper surface — cream base, warm ink, letterpress emboss, grain, tone switch"
```

---

### Task 3: Focus depth — paragraph dimming

**Files:**
- Create: `lib/focus-extension.ts` (custom Tiptap extension)
- Modify: `components/Editor.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `FocusDepthExtension` — Tiptap Extension, no external API
- Consumes: `useEditor` from `@tiptap/react` in Editor.tsx

- [ ] **Step 1: Add focus depth CSS to globals.css**

Append to `app/globals.css`:
```css
/* Focus depth — paragraphs dim as they recede from cursor */
.editor-wrap .tiptap p {
  transition: opacity 0.25s ease, filter 0.25s ease;
}

.editor-wrap .tiptap p[data-focus="current"] {
  opacity: 1;
  filter: none;
}

.editor-wrap .tiptap p[data-focus="near"] {
  opacity: 0.72;
  filter: none;
}

.editor-wrap .tiptap p[data-focus="far"] {
  opacity: 0.45;
  filter: blur(0.3px);
}

/* When editor has no focus at all, show everything at full opacity */
.editor-wrap .tiptap:not(:focus-within) p {
  opacity: 1;
  filter: none;
}
```

- [ ] **Step 2: Write lib/focus-extension.ts**

```typescript
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
```

- [ ] **Step 3: Add extension to Editor.tsx**

```tsx
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
        class: 'prose max-w-none focus:outline-none min-h-[60vh]',
      },
    },
  })

  return (
    <div className="editor-wrap">
      <EditorContent editor={editor} />
    </div>
  )
}
```

- [ ] **Step 4: Verify focus depth visually**

```bash
npm run dev
```

Type 5+ paragraphs (press Enter between each). Click into the middle paragraph. Verify:
- The paragraph your cursor is in is fully crisp
- Paragraphs 1–2 away are visibly softer
- Paragraphs far away are dimmed with subtle blur
- Clicking a different paragraph shifts the focal point

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: focus depth — current paragraph crisp, prior paragraphs recede"
```

---

### Task 4: Selection detection + MusePicker popover

**Files:**
- Create: `components/MusePicker.tsx`
- Modify: `components/Editor.tsx`

**Interfaces:**
- Produces: `<MusePicker selectedText={string} anchorRect={DOMRect} onPick={(persona: PersonaId) => void} onClose={() => void} />`
- Produces: `PersonaId = 'skeptic' | 'reader' | 'cd'`
- Consumes: Tiptap `editor.on('selectionUpdate', ...)` and `window.getSelection()`

- [ ] **Step 1: Write MusePicker.tsx**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { type PersonaId } from '@/lib/personas'

interface Props {
  anchorRect: DOMRect
  onPick: (persona: PersonaId) => void
  onClose: () => void
}

const PERSONAS: { id: PersonaId; label: string; hint: string }[] = [
  { id: 'skeptic', label: 'Skeptic', hint: 'Tests your claims' },
  { id: 'reader', label: 'Reader', hint: 'Represents your audience' },
  { id: 'cd', label: 'Director', hint: 'The agency lens' },
]

export default function MusePicker({ anchorRect, onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const top = anchorRect.bottom + window.scrollY + 6
  const left = anchorRect.left + window.scrollX

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top,
        left,
        fontFamily: 'var(--font-muse)',
        zIndex: 50,
      }}
      className="flex gap-1 bg-[var(--paper-bg)] border border-[var(--paper-ink)] border-opacity-20 rounded-lg shadow-sm p-1"
    >
      {PERSONAS.map(({ id, label, hint }) => (
        <button
          key={id}
          title={hint}
          onClick={() => onPick(id)}
          className="px-3 py-1 text-xs rounded-md hover:bg-black hover:bg-opacity-5 transition-colors"
          style={{ color: 'var(--paper-muse-ink)' }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

Note: `PersonaId` is imported from `@/lib/personas` — that file is created in Task 5. For now, stub the type in a temporary location or accept a TypeScript error that resolves in Task 5.

- [ ] **Step 2: Create lib/personas.ts stub (will be completed in Task 5)**

```typescript
export type PersonaId = 'skeptic' | 'reader' | 'cd'
```

This file will be replaced with full content in Task 5. Creating it now removes the import error in MusePicker.

- [ ] **Step 3: Wire selection detection into Editor.tsx**

```tsx
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
        class: 'prose max-w-none focus:outline-none min-h-[60vh]',
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
```

- [ ] **Step 4: Update page.tsx to accept onMusePick**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'
import PaperToneSwitch from '@/components/PaperToneSwitch'
import { PAPER_TONES, DEFAULT_TONE, type PaperTone } from '@/lib/paper'
import { type PersonaId } from '@/lib/personas'

export default function Home() {
  const [tone, setTone] = useState<PaperTone>(DEFAULT_TONE)

  useEffect(() => {
    const tokens = PAPER_TONES[tone]
    const root = document.documentElement
    for (const [key, val] of Object.entries(tokens)) {
      root.style.setProperty(key, val)
    }
  }, [tone])

  function handleMusePick(persona: PersonaId, selectedText: string, contextText: string) {
    // Wired in Task 6 — for now log to confirm wiring
    console.log('Muse pick:', persona, selectedText.slice(0, 40))
  }

  return (
    <main className="flex min-h-screen gap-8 px-8 py-12 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <Editor onMusePick={handleMusePick} />
      </div>
      <MarginRail />
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <PaperToneSwitch tone={tone} onChange={setTone} />
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Verify selection popover**

```bash
npm run dev
```

Type at least two sentences. Select some text with the mouse. Verify:
- A small popover appears just below the selection with "Skeptic", "Reader", "Director" buttons
- Clicking outside the popover closes it
- Selecting less than 3 characters shows no popover
- Console logs `Muse pick: skeptic ...` when a button is clicked

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: selection detection and MusePicker popover with three persona buttons"
```

---

### Task 5: API route + Skeptic persona (end-to-end)

**Files:**
- Create: `lib/personas.ts` (replaces stub)
- Create: `lib/muse-client.ts`
- Create: `app/api/muse/route.ts`

**Interfaces:**
- Produces: `PERSONAS: Record<PersonaId, PersonaDef>` where `PersonaDef = { id: PersonaId; name: string; systemPrompt: string }`
- Produces: `POST /api/muse` — `Request: { text: string; persona: PersonaId; context?: string }` → `Response: { question: string | null; persona: PersonaId }`
- Produces: `callMuse(params: MuseRequest): Promise<MuseResponse>` from `lib/muse-client.ts`

- [ ] **Step 1: Write failing test for personas.ts**

Create `__tests__/personas.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { PERSONAS, type PersonaId } from '@/lib/personas'

const IDS: PersonaId[] = ['skeptic', 'reader', 'cd']

describe('PERSONAS', () => {
  it('defines all three personas', () => {
    for (const id of IDS) {
      expect(PERSONAS[id]).toBeDefined()
    }
  })

  it('each persona has a non-empty system prompt', () => {
    for (const id of IDS) {
      expect(PERSONAS[id].systemPrompt.length).toBeGreaterThan(50)
    }
  })

  it('no system prompt contains "try:" or "consider writing:"', () => {
    for (const id of IDS) {
      const p = PERSONAS[id].systemPrompt.toLowerCase()
      expect(p).not.toContain('try:')
      expect(p).not.toContain('consider writing:')
    }
  })

  it('each system prompt instructs to return one question or null', () => {
    for (const id of IDS) {
      const p = PERSONAS[id].systemPrompt.toLowerCase()
      expect(p).toMatch(/one question|null/)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- personas
```
Expected: FAIL — `Cannot find module '@/lib/personas'` (the stub only exports the type)

- [ ] **Step 3: Write lib/personas.ts**

```typescript
export type PersonaId = 'skeptic' | 'reader' | 'cd'

export interface PersonaDef {
  id: PersonaId
  name: string
  systemPrompt: string
}

export const PERSONAS: Record<PersonaId, PersonaDef> = {
  skeptic: {
    id: 'skeptic',
    name: 'The Skeptic',
    systemPrompt: `You are The Skeptic, a close reader whose only lens is unsupported claims and missing reasoning.

Read the passage the writer has selected. Identify the most significant unsupported assertion, hand-waving, or gap in the logic.

Return exactly one question — a genuine, curious question that asks what backs the claim or where the reasoning goes. The question must refer to specific language in the passage.

Rules you must follow without exception:
- Return only one question, or the word null if there is nothing worth questioning.
- Do not rewrite any sentence. Do not suggest alternative phrasing.
- Do not compliment, praise, or encourage.
- Do not reference text outside the selected passage.
- Be curious in tone, not scolding or professorial.
- The question must end with a question mark.
- Two sentences maximum.`,
  },

  reader: {
    id: 'reader',
    name: 'The Reader',
    systemPrompt: `You are The Reader, representing the audience encountering this writing for the first time.

Read the passage the writer has selected. Identify the single place where a first-time reader is most likely to be confused, lose the thread, or hit an assumption they do not share.

Return exactly one question — a genuinely curious question that surfaces what a new reader would need or misunderstand.

Rules you must follow without exception:
- Return only one question, or the word null if the passage is already clear.
- Do not rewrite any sentence. Do not suggest alternative phrasing.
- Do not compliment, praise, or encourage.
- Do not reference text outside the selected passage.
- Be curious in tone, not scolding.
- The question must end with a question mark.
- Two sentences maximum.`,
  },

  cd: {
    id: 'cd',
    name: 'The Creative Director',
    systemPrompt: `You are The Creative Director, reading this passage through the lens of a senior agency strategist.

Your only concerns are: the single takeaway, the tension that makes this interesting, who it is really for, and the "so what" — why this matters beyond the words on the page.

Read the passage the writer has selected. Identify the single most important unresolved question about angle, audience, stakes, or central idea.

Return exactly one question — a genuine, curious question that surfaces what the piece is really about or who it is really for.

Rules you must follow without exception:
- Return only one question, or the word null if the passage has a clear, sharp point.
- Do not rewrite any sentence. Do not suggest alternative phrasing.
- Do not compliment, praise, or encourage.
- Do not reference text outside the selected passage.
- Be curious in tone, not prescriptive.
- The question must end with a question mark.
- Two sentences maximum.`,
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- personas
```
Expected: PASS (4 tests)

- [ ] **Step 5: Write app/api/muse/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { PERSONAS, type PersonaId } from '@/lib/personas'
import { validateMuseOutput } from '@/lib/muse-validation'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { text, persona, context } = body as {
    text: string
    persona: PersonaId
    context?: string
  }

  if (!text || !persona || !PERSONAS[persona]) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const personaDef = PERSONAS[persona]
  const userMessage = context
    ? `Document context (do not comment on this, only use it to understand the selected passage):\n\n${context.slice(0, 3000)}\n\n---\n\nSelected passage:\n\n${text}`
    : `Selected passage:\n\n${text}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: personaDef.systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : null
  const question = raw ? validateMuseOutput(raw) : null

  return NextResponse.json({ question, persona })
}
```

- [ ] **Step 6: Write lib/muse-client.ts**

```typescript
import { type PersonaId } from '@/lib/personas'

export interface MuseRequest {
  text: string
  persona: PersonaId
  context?: string
}

export interface MuseResponse {
  question: string | null
  persona: PersonaId
}

export async function callMuse(params: MuseRequest): Promise<MuseResponse> {
  const res = await fetch('/api/muse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Muse API error: ${res.status}`)
  return res.json()
}
```

- [ ] **Step 7: Create lib/muse-validation.ts stub**

This will be completed fully in Task 8. For now, create a pass-through so the route compiles:

```typescript
/** Returns the question if valid, or null if it should be rejected. Full validation added in Task 8. */
export function validateMuseOutput(raw: string): string | null {
  if (!raw || raw.toLowerCase() === 'null') return null
  return raw
}
```

- [ ] **Step 8: Verify API route end-to-end**

```bash
npm run dev
```

Type a paragraph in the editor. Select a sentence. Click "Skeptic". Open the browser DevTools Network tab. Confirm:
- A POST to `/api/muse` is made with `{ text: "...", persona: "skeptic", context: "..." }`
- The response contains `{ question: "...", persona: "skeptic" }` or `{ question: null, persona: "skeptic" }`
- No `ANTHROPIC_API_KEY` appears in any client-side network request or JS bundle

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: /api/muse route with Skeptic persona and muse-client fetch wrapper"
```

---

### Task 6: MarginRail + MuseNote anchored to selection

**Files:**
- Create: `components/MuseNote.tsx`
- Modify: `components/MarginRail.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `MuseNoteData = { id: string; persona: PersonaId; question: string; anchorTop: number; createdAt: number }`
- Produces: `<MuseNote note={MuseNoteData} onDismiss={(id: string) => void} />`
- Produces: `<MarginRail notes={MuseNoteData[]} onDismiss={(id: string) => void} />`
- Consumes: `callMuse` from `@/lib/muse-client`

- [ ] **Step 1: Write MuseNote.tsx**

```tsx
import { type MuseNoteData } from '@/lib/types'

const PERSONA_LABELS: Record<string, string> = {
  skeptic: 'Skeptic',
  reader: 'Reader',
  cd: 'Director',
}

interface Props {
  note: MuseNoteData
  onDismiss: (id: string) => void
}

export default function MuseNote({ note, onDismiss }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: note.anchorTop,
        fontFamily: 'var(--font-muse)',
        color: 'var(--paper-muse-ink)',
      }}
      className="w-64 text-xs leading-relaxed border-l-2 pl-3 py-1 group"
    >
      <div className="uppercase tracking-widest text-[10px] opacity-50 mb-1">
        {PERSONA_LABELS[note.persona]}
      </div>
      <p className="italic">{note.question}</p>
      <button
        onClick={() => onDismiss(note.id)}
        className="mt-1 opacity-0 group-hover:opacity-40 hover:!opacity-70 text-[10px] transition-opacity"
      >
        dismiss
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create lib/types.ts**

```typescript
import { type PersonaId } from '@/lib/personas'

export interface MuseNoteData {
  id: string
  persona: PersonaId
  question: string
  anchorTop: number
  createdAt: number
}
```

- [ ] **Step 3: Update MarginRail.tsx**

```tsx
import MuseNote from '@/components/MuseNote'
import { type MuseNoteData } from '@/lib/types'

interface Props {
  notes: MuseNoteData[]
  onDismiss: (id: string) => void
}

export default function MarginRail({ notes, onDismiss }: Props) {
  return (
    <aside className="margin-rail w-72 shrink-0 relative min-h-full">
      {notes.map((note) => (
        <MuseNote key={note.id} note={note} onDismiss={onDismiss} />
      ))}
    </aside>
  )
}
```

- [ ] **Step 4: Wire note state and callMuse in page.tsx**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'
import PaperToneSwitch from '@/components/PaperToneSwitch'
import { PAPER_TONES, DEFAULT_TONE, type PaperTone } from '@/lib/paper'
import { type PersonaId } from '@/lib/personas'
import { callMuse } from '@/lib/muse-client'
import { type MuseNoteData } from '@/lib/types'

export default function Home() {
  const [tone, setTone] = useState<PaperTone>(DEFAULT_TONE)
  const [notes, setNotes] = useState<MuseNoteData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const tokens = PAPER_TONES[tone]
    const root = document.documentElement
    for (const [key, val] of Object.entries(tokens)) {
      root.style.setProperty(key, val)
    }
  }, [tone])

  const handleMusePick = useCallback(
    async (persona: PersonaId, selectedText: string, contextText: string, anchorTop: number) => {
      if (loading) return
      setLoading(true)
      try {
        const result = await callMuse({ text: selectedText, persona, context: contextText })
        if (result.question) {
          setNotes((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              persona,
              question: result.question!,
              anchorTop,
              createdAt: Date.now(),
            },
          ])
        }
      } finally {
        setLoading(false)
      }
    },
    [loading]
  )

  function dismissNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <main className="flex min-h-screen gap-8 px-8 py-12 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <Editor onMusePick={handleMusePick} loading={loading} />
      </div>
      <MarginRail notes={notes} onDismiss={dismissNote} />
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <PaperToneSwitch tone={tone} onChange={setTone} />
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Update Editor.tsx to pass anchorTop and loading state**

Replace the `Props` interface and `handlePick` in `Editor.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { FocusDepthExtension } from '@/lib/focus-extension'
import MusePicker from '@/components/MusePicker'
import { type PersonaId } from '@/lib/personas'

interface Props {
  onMusePick?: (persona: PersonaId, selectedText: string, contextText: string, anchorTop: number) => void
  loading?: boolean
}

export default function Editor({ onMusePick, loading = false }: Props) {
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
        class: 'prose max-w-none focus:outline-none min-h-[60vh]',
      },
    },
  })

  function handlePick(persona: PersonaId) {
    if (!pickerRect) return
    const anchorTop = pickerRect.top + window.scrollY
    setPickerRect(null)
    const context = editor?.getText() ?? ''
    onMusePick?.(persona, selectedText, context, anchorTop)
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
```

- [ ] **Step 6: Verify full flow end-to-end**

```bash
npm run dev
```

Write two paragraphs. Select a sentence in the first paragraph. Click "Skeptic". Verify:
- "thinking…" appears briefly in the top-right of the editor
- A question card appears in the right margin, visually near the selected paragraph's vertical position
- The card shows "SKEPTIC" label and the question in italic
- Hovering the card reveals a "dismiss" button
- Clicking "dismiss" removes the card

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: MarginRail and MuseNote — anchored question cards with dismiss"
```

---

### Task 7: Reader + Creative Director personas

Reader and Creative Director prompts are already written in `lib/personas.ts` from Task 5. This task wires them into the MusePicker UI and verifies all three work end-to-end.

**Files:**
- No new files — verify existing wiring

**Interfaces:**
- Consumes: `PERSONAS` from `@/lib/personas` (all three already defined)

- [ ] **Step 1: Verify all three persona buttons appear in MusePicker**

The MusePicker already renders all three from the `PERSONAS` array defined in Task 4. Confirm `lib/personas.ts` from Task 5 exports `PersonaId` correctly (it does).

- [ ] **Step 2: Verify Reader and Director calls end-to-end**

```bash
npm run dev
```

Write a paragraph describing something for an audience (e.g., "This report shows why the budget needs to increase. The data is clear."). Select it. Click "Reader". Verify a question appears. Then select a different sentence and click "Director". Verify a second, different-persona card appears in the margin.

- [ ] **Step 3: Write a failing test validating persona prompt structure for all three**

The test was already written in Task 5 and covers all three personas. Run it now:

```bash
npm test -- personas
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Reader and Creative Director personas wired end-to-end"
```

---

### Task 8: Output validation guard

**Files:**
- Modify: `lib/muse-validation.ts` (replace stub with full implementation)

**Interfaces:**
- Produces: `validateMuseOutput(raw: string): string | null`
  - Returns `null` if: the output contains replacement-copy signals, exceeds two sentences, or is blank
  - Returns the cleaned question string otherwise

- [ ] **Step 1: Write failing tests for validateMuseOutput**

Create `__tests__/muse-validation.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { validateMuseOutput } from '@/lib/muse-validation'

describe('validateMuseOutput', () => {
  it('returns null for blank input', () => {
    expect(validateMuseOutput('')).toBeNull()
    expect(validateMuseOutput('   ')).toBeNull()
  })

  it('returns null when output is the word "null"', () => {
    expect(validateMuseOutput('null')).toBeNull()
    expect(validateMuseOutput('Null')).toBeNull()
    expect(validateMuseOutput('NULL')).toBeNull()
  })

  it('returns null when output contains "try:"', () => {
    expect(validateMuseOutput('Try: rewriting this sentence more clearly.')).toBeNull()
    expect(validateMuseOutput('What if you try: using simpler words?')).toBeNull()
  })

  it('returns null when output contains "consider writing:"', () => {
    expect(validateMuseOutput('Consider writing: a shorter opening.')).toBeNull()
  })

  it('returns null when output contains a quoted replacement sentence', () => {
    // Pattern: quoted text after a verb of suggestion
    expect(validateMuseOutput('You could say "The data supports this claim."')).toBeNull()
  })

  it('returns null when output is more than two sentences', () => {
    const long = 'Is this claim supported? Where does the evidence come from? Have you considered the counterargument as well?'
    expect(validateMuseOutput(long)).toBeNull()
  })

  it('returns the question for valid single-question output', () => {
    const q = 'What evidence would make this claim feel undeniable?'
    expect(validateMuseOutput(q)).toBe(q)
  })

  it('returns the question for valid two-sentence output', () => {
    const q = 'What does "clear" mean here? Clear to whom, exactly?'
    expect(validateMuseOutput(q)).toBe(q)
  })

  it('strips surrounding whitespace', () => {
    const q = '  What backs this assertion?  '
    expect(validateMuseOutput(q)).toBe('What backs this assertion?')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- muse-validation
```
Expected: multiple FAIL — the stub pass-through does not apply any rules.

- [ ] **Step 3: Write full lib/muse-validation.ts**

```typescript
const REPLACEMENT_SIGNALS = [
  /\btry:/i,
  /\bconsider writing:/i,
  /\byou could (say|write|phrase|put it as)\b.*"/i,
  /\bsomething like\b.*"/i,
]

function countSentences(text: string): number {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  const matches = text.match(/[.!?]+(\s|$)/g)
  return matches ? matches.length : 1
}

/** Returns the trimmed question if valid, null if it should be rejected. */
export function validateMuseOutput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase() === 'null') return null

  for (const pattern of REPLACEMENT_SIGNALS) {
    if (pattern.test(trimmed)) return null
  }

  if (countSentences(trimmed) > 2) return null

  return trimmed
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- muse-validation
```
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: output validation guard — rejects replacement copy and overlong responses"
```

---

### Task 9: Paper tone switch (three tones)

The `PaperToneSwitch` component and the three tones in `lib/paper.ts` were already built in Task 2. The tone switch applies CSS variables to `:root` via `useEffect` in `page.tsx`. This task verifies the full flow and adds the three-tone visual test.

**Files:**
- No new files

- [ ] **Step 1: Verify three-tone switching visually**

```bash
npm run dev
```

Toggle between Day, Cream, and Candle. Verify each produces a clearly distinct background temperature:
- Day: bright but off-white (not #fff)
- Cream: warm default
- Candle: noticeably amber/sepia — still readable, not garish

- [ ] **Step 2: Verify active tone button styling**

The active tone should appear at full opacity. The inactive two should appear dimmed. Confirm this in the browser.

- [ ] **Step 3: Commit if any tweaks were needed**

If you adjusted any token values in `lib/paper.ts` for better visual results:
```bash
git add lib/paper.ts
git commit -m "refine: paper tone token values for visual accuracy"
```

---

### Task 10: Sound engine + toggle

**Files:**
- Create: `lib/sound.ts`
- Create: `components/SoundToggle.tsx`
- Modify: `components/Editor.tsx` (fire typing sound on keydown)
- Modify: `app/page.tsx` (add SoundToggle, pass sound enabled state to Editor)

**Interfaces:**
- Produces: `initAudio(): AudioContext` — call once on first user interaction
- Produces: `playTypingSound(ctx: AudioContext): void`
- Produces: `playMuseArrivalSound(ctx: AudioContext): void`
- Produces: `<SoundToggle enabled={boolean} onChange={(v: boolean) => void} />`

- [ ] **Step 1: Write failing tests for sound.ts**

Create `__tests__/sound.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

// Mock Web Audio API
const mockConnect = vi.fn()
const mockStart = vi.fn()
const mockStop = vi.fn()
const mockDisconnect = vi.fn()

const mockOscillator = {
  connect: mockConnect,
  start: mockStart,
  stop: mockStop,
  frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  type: 'sine',
}

const mockGain = {
  connect: mockConnect,
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
}

const mockCtx = {
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGain),
  destination: {},
  currentTime: 0,
}

vi.stubGlobal('AudioContext', vi.fn(() => mockCtx))

import { initAudio, playTypingSound, playMuseArrivalSound } from '@/lib/sound'

describe('sound.ts', () => {
  it('initAudio returns an AudioContext', () => {
    const ctx = initAudio()
    expect(ctx).toBeDefined()
  })

  it('playTypingSound does not throw', () => {
    const ctx = initAudio()
    expect(() => playTypingSound(ctx as unknown as AudioContext)).not.toThrow()
  })

  it('playMuseArrivalSound does not throw', () => {
    const ctx = initAudio()
    expect(() => playMuseArrivalSound(ctx as unknown as AudioContext)).not.toThrow()
  })

  it('playTypingSound and playMuseArrivalSound use different base frequencies', () => {
    const ctx = initAudio()
    // Reset call tracking
    mockOscillator.frequency.setValueAtTime.mockClear()

    playTypingSound(ctx as unknown as AudioContext)
    const typingFreq = mockOscillator.frequency.setValueAtTime.mock.calls[0]?.[0]

    mockOscillator.frequency.setValueAtTime.mockClear()
    playMuseArrivalSound(ctx as unknown as AudioContext)
    const museFreq = mockOscillator.frequency.setValueAtTime.mock.calls[0]?.[0]

    expect(typingFreq).not.toEqual(museFreq)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- sound
```
Expected: FAIL — `Cannot find module '@/lib/sound'`

- [ ] **Step 3: Write lib/sound.ts**

```typescript
let _ctx: AudioContext | null = null

export function initAudio(): AudioContext {
  if (!_ctx) {
    _ctx = new AudioContext()
  }
  return _ctx
}

function jitter(base: number, range: number): number {
  return base + (Math.random() - 0.5) * range
}

/** Soft wood-and-felt typing click. */
export function playTypingSound(ctx: AudioContext): void {
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(jitter(0.04, 0.02), now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)

  const osc = ctx.createOscillator()
  osc.connect(gain)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(jitter(180, 40), now)
  osc.frequency.exponentialRampToValueAtTime(jitter(100, 20), now + 0.06)
  osc.start(now)
  osc.stop(now + 0.09)
}

/** Gentler, higher arrival chime for when the muse speaks. */
export function playMuseArrivalSound(ctx: AudioContext): void {
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.06, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)

  const osc = ctx.createOscillator()
  osc.connect(gain)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(jitter(520, 20), now)
  osc.frequency.exponentialRampToValueAtTime(jitter(440, 10), now + 0.5)
  osc.start(now)
  osc.stop(now + 0.65)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- sound
```
Expected: PASS (4 tests)

- [ ] **Step 5: Write SoundToggle.tsx**

```tsx
interface Props {
  enabled: boolean
  onChange: (v: boolean) => void
}

export default function SoundToggle({ enabled, onChange }: Props) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{ fontFamily: 'var(--font-muse)', color: 'var(--paper-muse-ink)' }}
      className="text-xs px-2 py-1 opacity-40 hover:opacity-70 transition-opacity"
      title={enabled ? 'Sound on' : 'Sound off'}
    >
      {enabled ? '♪' : '♩'}
    </button>
  )
}
```

- [ ] **Step 6: Wire sound into Editor.tsx**

Add `soundEnabled` and `audioCtx` ref to `Editor.tsx`:

```tsx
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
  onMusePick?: (persona: PersonaId, selectedText: string, contextText: string, anchorTop: number) => void
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

  function handleKeyDown() {
    if (soundEnabled && audioRef.current) {
      playTypingSound(audioRef.current)
    }
  }

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
        class: 'prose max-w-none focus:outline-none min-h-[60vh]',
      },
      handleKeyDown: () => {
        handleKeyDown()
        return false // don't intercept the event
      },
    },
  })

  function handlePick(persona: PersonaId) {
    if (!pickerRect) return
    const anchorTop = pickerRect.top + window.scrollY
    setPickerRect(null)
    const context = editor?.getText() ?? ''
    onMusePick?.(persona, selectedText, context, anchorTop)
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
```

- [ ] **Step 7: Wire sound and muse-arrival into page.tsx**

Add `soundEnabled` state and `SoundToggle` to `page.tsx`. Also import `playMuseArrivalSound` and call it when a note is added:

```tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'
import PaperToneSwitch from '@/components/PaperToneSwitch'
import SoundToggle from '@/components/SoundToggle'
import { PAPER_TONES, DEFAULT_TONE, type PaperTone } from '@/lib/paper'
import { type PersonaId } from '@/lib/personas'
import { callMuse } from '@/lib/muse-client'
import { type MuseNoteData } from '@/lib/types'
import { initAudio, playMuseArrivalSound } from '@/lib/sound'

export default function Home() {
  const [tone, setTone] = useState<PaperTone>(DEFAULT_TONE)
  const [notes, setNotes] = useState<MuseNoteData[]>([])
  const [loading, setLoading] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const tokens = PAPER_TONES[tone]
    const root = document.documentElement
    for (const [key, val] of Object.entries(tokens)) {
      root.style.setProperty(key, val)
    }
  }, [tone])

  function handleSoundChange(v: boolean) {
    setSoundEnabled(v)
    if (v && !audioRef.current) {
      audioRef.current = initAudio()
    }
  }

  const handleMusePick = useCallback(
    async (persona: PersonaId, selectedText: string, contextText: string, anchorTop: number) => {
      if (loading) return
      setLoading(true)
      try {
        const result = await callMuse({ text: selectedText, persona, context: contextText })
        if (result.question) {
          setNotes((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              persona,
              question: result.question!,
              anchorTop,
              createdAt: Date.now(),
            },
          ])
          if (soundEnabled && audioRef.current) {
            playMuseArrivalSound(audioRef.current)
          }
        }
      } finally {
        setLoading(false)
      }
    },
    [loading, soundEnabled]
  )

  function dismissNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <main className="flex min-h-screen gap-8 px-8 py-12 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <Editor onMusePick={handleMusePick} loading={loading} soundEnabled={soundEnabled} />
      </div>
      <MarginRail notes={notes} onDismiss={dismissNote} />
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <PaperToneSwitch tone={tone} onChange={setTone} />
        <SoundToggle enabled={soundEnabled} onChange={handleSoundChange} />
      </div>
    </main>
  )
}
```

- [ ] **Step 8: Verify sound**

```bash
npm run dev
```

Click the ♩ button to enable sound. Type some characters — you should hear a soft muted tap for each keystroke with slight pitch variation. Pull a muse persona — when the note appears you should hear a distinct, higher chime. Toggle sound off — silence returns.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: Web Audio sound engine — typing clicks with jitter and muse-arrival chime"
```

---

### Task 11: localStorage persistence — document + notes

**Files:**
- Create: `lib/storage.ts`
- Modify: `components/Editor.tsx` (load/save document content)
- Modify: `app/page.tsx` (load/save notes, add clear-all)

**Interfaces:**
- Produces: `saveDocument(content: string): void`
- Produces: `loadDocument(): string | null`
- Produces: `saveNotes(notes: MuseNoteData[]): void`
- Produces: `loadNotes(): MuseNoteData[]`

- [ ] **Step 1: Write failing tests for storage.ts**

Create `__tests__/storage.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'

// jsdom provides localStorage
beforeEach(() => {
  localStorage.clear()
})

import { saveDocument, loadDocument, saveNotes, loadNotes } from '@/lib/storage'
import { type MuseNoteData } from '@/lib/types'

describe('document persistence', () => {
  it('loadDocument returns null when nothing saved', () => {
    expect(loadDocument()).toBeNull()
  })

  it('saves and loads document content', () => {
    saveDocument('Hello world')
    expect(loadDocument()).toBe('Hello world')
  })

  it('overwrites previous document', () => {
    saveDocument('first')
    saveDocument('second')
    expect(loadDocument()).toBe('second')
  })
})

describe('notes persistence', () => {
  it('loadNotes returns empty array when nothing saved', () => {
    expect(loadNotes()).toEqual([])
  })

  it('saves and loads notes', () => {
    const notes: MuseNoteData[] = [
      { id: '1', persona: 'skeptic', question: 'Why?', anchorTop: 100, createdAt: 1000 },
    ]
    saveNotes(notes)
    expect(loadNotes()).toEqual(notes)
  })

  it('returns empty array when stored JSON is invalid', () => {
    localStorage.setItem('muse:notes', 'not-json{{{')
    expect(loadNotes()).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- storage
```
Expected: FAIL — `Cannot find module '@/lib/storage'`

- [ ] **Step 3: Write lib/storage.ts**

```typescript
import { type MuseNoteData } from '@/lib/types'

const DOC_KEY = 'muse:document'
const NOTES_KEY = 'muse:notes'

export function saveDocument(content: string): void {
  try {
    localStorage.setItem(DOC_KEY, content)
  } catch {}
}

export function loadDocument(): string | null {
  try {
    return localStorage.getItem(DOC_KEY)
  } catch {
    return null
  }
}

export function saveNotes(notes: MuseNoteData[]): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
  } catch {}
}

export function loadNotes(): MuseNoteData[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MuseNoteData[]
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- storage
```
Expected: PASS (5 tests)

- [ ] **Step 5: Load and save document in Editor.tsx**

Add initial content from `loadDocument()` and an `onUpdate` handler that debounce-saves:

```tsx
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { FocusDepthExtension } from '@/lib/focus-extension'
import MusePicker from '@/components/MusePicker'
import { type PersonaId } from '@/lib/personas'
import { initAudio, playTypingSound } from '@/lib/sound'
import { saveDocument, loadDocument } from '@/lib/storage'

interface Props {
  onMusePick?: (persona: PersonaId, selectedText: string, contextText: string, anchorTop: number) => void
  loading?: boolean
  soundEnabled?: boolean
}

export default function Editor({ onMusePick, loading = false, soundEnabled = false }: Props) {
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const audioRef = useRef<AudioContext | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function handleKeyDown() {
    if (soundEnabled && audioRef.current) {
      playTypingSound(audioRef.current)
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Begin writing…' }),
      FocusDepthExtension,
    ],
    content: loadDocument() ?? '',
    onSelectionUpdate: handleSelectionUpdate,
    onUpdate: ({ editor: e }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveDocument(e.getHTML())
      }, 800)
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[60vh]',
      },
      handleKeyDown: () => {
        handleKeyDown()
        return false
      },
    },
  })

  function handlePick(persona: PersonaId) {
    if (!pickerRect) return
    const anchorTop = pickerRect.top + window.scrollY
    setPickerRect(null)
    const context = editor?.getText() ?? ''
    onMusePick?.(persona, selectedText, context, anchorTop)
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
```

- [ ] **Step 6: Load and save notes in page.tsx**

Add `loadNotes` on mount and `saveNotes` on every notes change. Also add a "clear all" button in the margin when notes exist:

```tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'
import PaperToneSwitch from '@/components/PaperToneSwitch'
import SoundToggle from '@/components/SoundToggle'
import { PAPER_TONES, DEFAULT_TONE, type PaperTone } from '@/lib/paper'
import { type PersonaId } from '@/lib/personas'
import { callMuse } from '@/lib/muse-client'
import { type MuseNoteData } from '@/lib/types'
import { initAudio, playMuseArrivalSound } from '@/lib/sound'
import { saveNotes, loadNotes } from '@/lib/storage'

export default function Home() {
  const [tone, setTone] = useState<PaperTone>(DEFAULT_TONE)
  const [notes, setNotes] = useState<MuseNoteData[]>([])
  const [loading, setLoading] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)

  // Load notes on mount
  useEffect(() => {
    setNotes(loadNotes())
  }, [])

  // Persist notes on every change
  useEffect(() => {
    saveNotes(notes)
  }, [notes])

  useEffect(() => {
    const tokens = PAPER_TONES[tone]
    const root = document.documentElement
    for (const [key, val] of Object.entries(tokens)) {
      root.style.setProperty(key, val)
    }
  }, [tone])

  function handleSoundChange(v: boolean) {
    setSoundEnabled(v)
    if (v && !audioRef.current) {
      audioRef.current = initAudio()
    }
  }

  const handleMusePick = useCallback(
    async (persona: PersonaId, selectedText: string, contextText: string, anchorTop: number) => {
      if (loading) return
      setLoading(true)
      try {
        const result = await callMuse({ text: selectedText, persona, context: contextText })
        if (result.question) {
          setNotes((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              persona,
              question: result.question!,
              anchorTop,
              createdAt: Date.now(),
            },
          ])
          if (soundEnabled && audioRef.current) {
            playMuseArrivalSound(audioRef.current)
          }
        }
      } finally {
        setLoading(false)
      }
    },
    [loading, soundEnabled]
  )

  function dismissNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  function clearAllNotes() {
    setNotes([])
  }

  return (
    <main className="flex min-h-screen gap-8 px-8 py-12 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <Editor onMusePick={handleMusePick} loading={loading} soundEnabled={soundEnabled} />
      </div>
      <MarginRail notes={notes} onDismiss={dismissNote} onClearAll={notes.length > 1 ? clearAllNotes : undefined} />
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <PaperToneSwitch tone={tone} onChange={setTone} />
        <SoundToggle enabled={soundEnabled} onChange={handleSoundChange} />
      </div>
    </main>
  )
}
```

- [ ] **Step 7: Add onClearAll to MarginRail.tsx**

```tsx
import MuseNote from '@/components/MuseNote'
import { type MuseNoteData } from '@/lib/types'

interface Props {
  notes: MuseNoteData[]
  onDismiss: (id: string) => void
  onClearAll?: () => void
}

export default function MarginRail({ notes, onDismiss, onClearAll }: Props) {
  return (
    <aside className="margin-rail w-72 shrink-0 relative min-h-full">
      {onClearAll && (
        <div
          className="sticky top-4 flex justify-end mb-2"
          style={{ fontFamily: 'var(--font-muse)' }}
        >
          <button
            onClick={onClearAll}
            className="text-xs opacity-30 hover:opacity-60 transition-opacity"
            style={{ color: 'var(--paper-muse-ink)' }}
          >
            clear all
          </button>
        </div>
      )}
      {notes.map((note) => (
        <MuseNote key={note.id} note={note} onDismiss={onDismiss} />
      ))}
    </aside>
  )
}
```

- [ ] **Step 8: Verify persistence**

```bash
npm run dev
```

Write several paragraphs. Pull three muse notes. Hard-refresh the page (`Cmd+Shift+R`). Verify:
- Your written text is restored exactly
- All muse notes reappear in the margin
- Dismissing a note and refreshing confirms it stays dismissed
- "clear all" button appears when 2+ notes exist and removes them all

- [ ] **Step 9: Run full test suite**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "feat: localStorage persistence — document and notes survive refresh, clear-all"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task that covers it |
|---|---|
| Cream base, warm near-black ink | Task 2 |
| Faint grain texture | Task 2 (`body::before` SVG noise) |
| Letterpress depth (static) | Task 2 (`text-shadow` in globals.css) |
| Focus depth — current paragraph crispest | Task 3 |
| Three paper tones (daylight, cream, candlelight) | Task 2 + Task 9 |
| Light only, no dark mode | Task 2 (CSS vars, no dark media query anywhere) |
| Two-column layout (editor left, margin right) | Task 1 |
| Tiptap (not raw contenteditable) | Task 1 |
| EB Garamond for prose, Inter for muse | Task 1 |
| Selection popover appears on select | Task 4 |
| Three personas — Skeptic, Reader, CD | Task 5 (prompts) + Task 7 (verified) |
| Persona prompts: one question or null, no rewrites | Task 5 |
| POST /api/muse route | Task 5 |
| API key server-side only | Task 5 (env var in route.ts only) |
| Model: claude-sonnet-4-6 | Task 5 (hardcoded in route.ts) |
| Output validation guard | Task 8 |
| Notes anchored to selection | Task 6 |
| Notes dismissible | Task 6 |
| Paper tone switch | Task 2 + Task 9 |
| Web Audio sound engine (no `<audio>` tags) | Task 10 |
| Typing sound with jitter | Task 10 |
| Muse-arrival sound distinct from typing | Task 10 |
| Sound off by default | Task 10 (default `soundEnabled=false`) |
| localStorage persistence for document | Task 11 |
| localStorage persistence for notes | Task 11 |
| Clear all notes | Task 11 |

**All spec requirements have a corresponding task. No gaps found.**

**Placeholder scan:** No TBD, TODO, or vague steps found. Every code step contains actual code.

**Type consistency:** `PersonaId`, `MuseNoteData`, `PaperTone` are defined once in their canonical files and imported everywhere. `callMuse`/`validateMuseOutput` signatures are consistent between definition (Tasks 5/8) and usage (Tasks 6/11). `onMusePick` signature is extended exactly once (Task 6, adds `anchorTop`) and matched in both Editor.tsx and page.tsx.
