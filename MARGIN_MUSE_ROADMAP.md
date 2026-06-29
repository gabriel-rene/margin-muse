# Margin Muse — Roadmap & Spec

Single source of truth. Supersedes the earlier v1 build brief by folding it into a versioned plan.

## What it is

A writing editor that feels like writing on real paper, where AI augments thinking instead of producing copy. The AI plays three separate roles, kept distinct on purpose:

- **The Muse** asks a question about a passage you select. On pull. Never rewrites, never generates copy.
- **The Cartographer** maps the structure of your document (topics, characters, arcs) when you ask. On its own tab.
- **The Instruments** measure mechanical things (adverbs, reading level, passive voice). Deterministic, local, no LLM.

Three roles, three trust profiles. Instruments measure, muse asks, cartographer maps.

## Global principles (apply to every version)

1. **Pull, not push.** The AI never decides when to speak. Every AI action is initiated by the writer: select and pull the muse, ask the cartographer to map. No auto-firing, no watch-the-document behavior, no debounce-on-typing.
2. **Questions and reflections, never copy.** No muse, no feature rewrites the writer's prose, suggests replacement sentences, autocompletes, or generates draft text. This is the product's identity. Enforce it in prompts and validate output shape.
3. **Curious, not preachy.** Every AI voice is warm, curious, and educational. Never deterministic, scolding, or professor-like. The muse wonders, it does not grade. The cartographer points out what it noticed, it does not lecture. The instruments present, they do not nag.
4. **Silence is allowed.** Any AI role may return "nothing useful here" rather than fabricate. Surface that honestly.
5. **Everything cites itself.** Any AI claim about the document points to a real, clickable span in the text. No ungrounded assertions about what the doc contains.
6. **Light only, paper always.** No dark mode. Night is served by a dim warm paper tone, not white-on-black.
7. **Calm is the product.** Motion serves attention, never decoration. No nagging layers, no pushy animation.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind
- **Tiptap** (ProseMirror-based) as the editor core. Settled decision, do not use raw contenteditable.
- Anthropic API via server route, key server-side only, never in client
- Model: `claude-sonnet-4-6`
- Web Audio API for sound (never `<audio>` tags, latency would ruin it)
- No database through v2. Document and notes persist in localStorage.

**Why Tiptap, not raw contenteditable or CodeMirror**
Raw contenteditable has no document position model. Adding decorations (adverb highlights, instrument overlays, cartographer markers) the normal way fragments the DOM and corrupts anchor offsets. You'd be hand-rolling brittle offset math across every version.

Tiptap gives three things every version of this app needs: stable document positions that survive edits, a decorations layer that overlays highlights without mutating text, and automatic position mapping that moves anchors through edits. CodeMirror 6 has the same three properties but is not a rich text editor and cannot become one — migrating off it later means rebuilding the entire surface layer. Tiptap starts heavier but rich formatting (bold, italic, headings) is a near-certainty given the copy-paste-to-publishing use case, so the foundation is set once and never touched again.

**Focus depth with Tiptap**
ProseMirror thinks in paragraphs, not visual lines. The focus-depth effect (current paragraph crispest, prior paragraphs settled back slightly) is implemented per paragraph. This is actually more natural for prose: you finish a thought, it settles — not you finish a word. Per-line crispness is a lovely typewriter detail but paragraph-level focus serves the writing just as well and fits the model cleanly.

---

# v1 — The Paper and the Muse

The soul of the product. The sensorial writing surface plus the pull-based muse. Enough to feel whether it is special.

## The writing surface

**Color and texture**
- Base is warm off-white or cream. Never pure white (#fff is the most un-paper color there is).
- Body text is a warm near-black (dark warm gray-brown), never pure #000. This single choice does most of the warm, balanced contrast work.
- Faint grain on the surface and margins, kept mostly out from under the text column so it never costs legibility.

**Paper tones (light-only, pick one active at a time)**
- Daylight: bright clean sheet.
- Cream: warm, default.
- Candlelight: dim warm sepia for night, still ink-on-paper.

**Letterpress depth**
- Static emboss on the whole text layer: a subtle light shadow below each glyph and a subtle dark above, so type reads as very slightly pressed into the sheet.
- No per-keystroke depth animation. The effect is static. This keeps the typewriter feel without jank or distraction.

**Focus depth (the one motion effect)**
- The current paragraph is the crispest thing on the page.
- Paragraphs already written settle back very slightly: a touch lower in contrast, optionally a hair of blur on the far-up ones.
- Depth equals focus. The eye stays at the nib. No parallax, no decorative shadows.
- Implemented per paragraph via Tiptap decorations, not per visual line.

**Typography (the trust rule)**
- Writer's prose: a literary old-style text serif built for long reading, not a display face.
- Muse's voice: clearly other. Smaller, a quiet sans or italic, living in the margin.
- The writer must never mistake the AI's voice for their own at a glance. The voices are separated typographically.

**Sound (optional, off by default)**
- One-tap toggle, off by default.
- Synthesized or tiny samples through Web Audio. Soft wood and felt character, not mechanical-keyboard blue switches.
- Small random jitter on pitch and timing so it never feels robotic.
- The muse's arrival has its own gentle sound, distinct from typing, so you hear it spoke without looking up.

## The Muse

**Interaction**
- Two-column layout: writing surface left, margin rail right.
- On text selection, a small inline popover offers the available muses.
- Picking a muse fires the pull: selected text plus a window of surrounding context goes to the server route.
- The returned question appears as a card in the margin rail, visually tied to the source passage (highlight the span, align the card near it).
- Notes are dismissible and persist with the document until dismissed.

**Personas (v1 set, three)**
Each is a fixed lens with a rubric-shaped prompt.
- **The Skeptic**: pressure-tests claims. Lens: unsupported assertions, missing reasoning, hand-waving. Surfaces the specific claim and asks what backs it.
- **The Reader**: represents the audience. Lens: clarity, assumed knowledge, who this is for. Asks what a first-time reader would misunderstand or need.
- **The Creative Director**: the agency lens. Lens: single takeaway, tension, audience, the "so what." Asks for the one idea, the stakes, the angle.

Each persona prompt must:
- State the one lens it judges through.
- Return exactly one question, or null, about the selected passage.
- Forbid rewriting, suggesting copy, or complimenting. No praise, no edits.
- Be curious in tone, not preachy.
- Use surrounding context only to understand the passage, not to comment outside the selection.

**API route contract**
```
POST /api/muse
Request:  { text: string, persona: "skeptic" | "reader" | "cd", context?: string }
Response: { question: string | null, persona: string }
```
- System prompt per persona from `/lib/personas.ts`.
- Low `max_tokens`, the output is one question.

**Output validation guard (keeps the product honest)**
Before returning to the client:
- Reject if it contains quoted replacement sentences or "try:" / "consider writing:" patterns.
- Reject if longer than ~2 sentences.
- Return a clean single question, or null.

## File layout

```
/app
  /page.tsx                 editor shell (two-column)
  /api/muse/route.ts        POST muse pull
/lib
  /personas.ts              persona definitions + system prompts
  /muse-client.ts           client fetch wrapper
  /paper.ts                 paper tone tokens
  /sound.ts                 Web Audio engine
/components
  /Editor.tsx               writing surface (selection offsets must be reliable)
  /MarginRail.tsx           right column, holds notes
  /MuseNote.tsx             one note card
  /MusePicker.tsx           selection popover
  /PaperToneSwitch.tsx      daylight / cream / candlelight
  /SoundToggle.tsx
```

## Build order
1. Editor shell, two-column layout, working text surface with reliable selection offsets.
2. Paper surface: cream base, warm ink, static letterpress emboss, grain.
3. Focus depth on current vs prior lines.
4. Selection detection + MusePicker popover.
5. `/api/muse` end to end with one persona (Skeptic).
6. MarginRail + MuseNote anchored to the selection.
7. Add Reader and Creative Director.
8. Output validation guard.
9. Paper tone switch (three tones).
10. Sound engine + toggle, with distinct typing and muse-arrival sounds.
11. localStorage persistence of document and open notes; dismiss/clear.

## v1 done
Writer types prose on a paper surface with warm ink, letterpress depth, focus falloff, and optional sound. They select a passage, pull any of three muses, and get one anchored question (or an honest "no note") in the margin. API key never client-side. Copy generation structurally impossible. Three paper tones, light only.

---

# v1.5 — The Instruments

Mechanical writing feedback. Deterministic and local. Cheap, additive, no API calls.

## Principles
- All of this is computed locally. No LLM. Faster, free, private, never wrong.
- Ambient and muted, or behind a pull. Never a nagging red-squiggle layer.
- Present, do not scold. The writer judges.

## Features
- **Adverb highlight**: a toggle that marks every -ly adverb. "Here are your 14 adverbs," not "remove these." Adverb-hating is a style opinion, not a law.
- **Reading level**: Flesch-Kincaid and kin, computed live, shown quietly against a target the writer sets. Doubles as a real asset for agency copy written to a deliberate grade level.
- **Passive voice**: highlight on toggle.
- **Filter words**: just, really, very, etc., on toggle.
- **Sentence rhythm**: sentence-length variance, surfaced quietly. Variance is what makes prose feel alive.

## v1.5 done
The writer can toggle any instrument on or off, see mechanical signals presented calmly against their own targets, and never be nagged. Zero API calls in this layer.

---

# v2 — The Cartographer

Structural map of the document on its own tab. The most interpretive feature, so it ships last, after a dedicated UX study.

## What it does
- Lives on a separate tab from the writing surface. Every marker links back into the writing surface at the exact spot.
- Two ways in, both pull-initiated:
  - **Declared tracking**: the writer names what to map. "Track Maria and the lighthouse." "Where do I cover the budget argument."
  - **Suggested discovery**: the writer asks the assistant what might be worth tracking, and it offers candidate topics, characters, or arcs in a curious, educational tone. The writer accepts or ignores. This stays pull because the writer asks for it.

## Visualization
- A vertical spine mirroring the document top to bottom.
- One lane per tracked thing, markers where each appears.
- A semantic minimap. Click a marker, jump to that spot in the text.
- Fits the physical metaphor: the manuscript laid out with tabbed pages.

## Tone and trust
- Curious and educational, never deterministic or professor-like. The cartographer says what it noticed and wonders about gaps, it does not grade.
- Every marker points to a real, clickable span. The map cites itself.
- If unsure whether a mention belongs, it says so rather than faking precision.

## The real payoff
Not the picture, the absence and imbalance it exposes:
- "Grief shows up heavily in the first third and never returns."
- "This character vanishes for 40 pages."
- "You spend more words on the counterargument than the argument."
Lead the feature on gaps and lopsidedness, not on the visualization.

## Explicitly deferred
- **Depth of coverage scoring**: cut for now. Too fuzzy, too risky, where LLMs confabulate. Revisit in a later version if at all.

## Scope notes
- Fiction (plot points, arcs) and nonfiction (claim, evidence, turn) share the same spine, only the lanes differ.
- Build entity and topic tracking first (most reliable, most universal). Treat arc detection as a later, more interpretive layer.

## Open questions to settle in the UX study
- How declared tracking and suggested discovery share one interface without clutter.
- How to render a lane that appears, disappears, and reappears, so absence is legible at a glance.
- How markers behave as the document is edited and offsets shift.

## v2 done
The writer can open a map tab, either name what to track or ask what is worth tracking, and see a self-citing vertical map whose markers jump back into the text, with gaps and imbalance made visible, and no fuzzy coverage scores.

---

## Sequencing summary
- **v1**: paper surface + muse. The soul. Ship and feel it.
- **v1.5**: instruments. Deterministic, cheap, additive.
- **v2**: cartographer. After its own UX study, since it is the part most likely to be wrong if rushed.
