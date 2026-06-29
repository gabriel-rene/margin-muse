# Margin Muse

A writing editor that feels like writing on real paper, where AI augments thinking instead of producing copy. You write prose on a warm paper surface; you select a passage and *pull* one of three muses; it returns a single question in the margin — never a rewrite.

This repository implements **v1 — The Paper and the Muse**. See [`MARGIN_MUSE_ROADMAP.md`](MARGIN_MUSE_ROADMAP.md) for the full spec and the v1.5 / v2 plan.

## What v1 does

- **Paper surface** — warm cream base (never pure white), warm near-black ink (never pure black), static letterpress emboss, faint grain, three light-only paper tones (Daylight / Cream / Candlelight).
- **Focus depth** — the paragraph your cursor is in stays crisp; paragraphs further away dim and slightly blur. One motion effect, per paragraph.
- **The Muse** — select text, pick a persona (Skeptic / Reader / Creative Director), get one anchored question in the right margin. Dismissible. The muse never rewrites your prose — enforced in the persona prompts *and* by a deterministic output guard.
- **Sound** (off by default) — soft wood-and-felt typing taps with pitch/timing jitter, plus a distinct chime when the muse's question arrives. Web Audio only.
- **Persistence** — your document and open notes survive a refresh (localStorage; no database in v1).

## Running it

```bash
npm install

# The muse calls the Anthropic API server-side. Put a real key in .env.local:
#   ANTHROPIC_API_KEY=sk-ant-...
# (the file is gitignored; the key is never sent to the client)

npm run dev      # http://localhost:3000
```

Other commands:

```bash
npm test         # Vitest — 28 unit tests (paper, personas, validation, sound, storage)
npm run build    # production build / type-check
```

The model is `claude-sonnet-4-6`, hardcoded server-side in `app/api/muse/route.ts`. Without a valid `ANTHROPIC_API_KEY`, the paper surface, focus depth, sound, tones, and persistence all work; only the muse pull will return an error (handled gracefully — the editor never wedges).

## Architecture

- `app/page.tsx` — two-column shell, owns tone / notes / loading / sound state.
- `app/api/muse/route.ts` — the only place the Anthropic key and SDK live. Validates the persona, calls the model, runs the output through the guard.
- `lib/personas.ts` — the three persona system prompts (one lens each, one question or null, no rewriting).
- `lib/muse-validation.ts` — deterministic guard that rejects replacement-copy signals and over-long output.
- `lib/focus-extension.ts` — Tiptap/ProseMirror decoration for per-paragraph focus depth.
- `lib/paper.ts` / `lib/sound.ts` / `lib/storage.ts` — paper tones, Web Audio engine, localStorage.
- `components/` — `Editor`, `MarginRail`, `MuseNote`, `MusePicker`, `PaperToneSwitch`, `SoundToggle`.

## Known v1 limitations

These are deliberate v1 boundaries, surfaced by the final review and consistent with the roadmap's sequencing:

- **Note anchors are frozen pixel offsets.** A note's vertical position is captured at pull time and not recomputed, so it drifts out of alignment with its source passage after you edit earlier prose, reload at a different viewport width, or change a tone that shifts line-height. The edit-resilient fix (anchor to a ProseMirror position, map it through edits) is a v1.5 carry-in — the Tiptap foundation was chosen to make it possible.
- **Margin notes can overlap.** Notes are absolutely positioned with no collision avoidance; two pulls on adjacent paragraphs may stack. Fine at v1's low note density.
- **Two integration seams lack automated coverage** (unit tests can't reach them in jsdom): the muse-arrival sound firing end-to-end, and the failed-pull path clearing the loading state. Verify these with a quick manual pass.
