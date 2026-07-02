# Margin Muse

A writing editor that feels like writing on real paper, where AI augments thinking instead of producing copy. You write prose on a warm paper surface; you select a passage and *pull* one of three muses; it returns a single question in the margin — never a rewrite.

This repository implements **v1 — The Paper and the Muse**. See [`MARGIN_MUSE_ROADMAP.md`](MARGIN_MUSE_ROADMAP.md) for the full spec and the v1.5 / v2 plan.

## What v1 does

- **Paper surface** — warm cream base (never pure white), warm near-black ink (never pure black), static letterpress emboss, faint grain, three light-only paper tones (Daylight / Cream / Candlelight).
- **Focus depth** — the paragraph your cursor is in stays crisp; paragraphs further away dim and slightly blur. One motion effect, per paragraph.
- **The Muse** — select text, pick a persona (Skeptic / Reader / Creative Director), get one anchored question in the right margin. Dismissible. The muse never rewrites your prose — enforced in the persona prompts *and* by a deterministic output guard.
- **Sound** (off by default) — soft wood-and-felt typing taps with pitch/timing jitter, plus a distinct chime when the muse's question arrives. Web Audio only.
- **Persistence** — notes (including margin questions) are saved as local Markdown files in the vault and survive refreshes and restarts.

## Running it

```bash
npm install

# Configure a muse provider in .env.local (copy .env.example).
# Default is Gemini:
#   GEMINI_API_KEY=...
# (the file is gitignored; the key is read only on the server)

npm run dev      # http://localhost:3000
```

The local writing, Markdown, rich-text, and versioning features work without any muse provider configured; only muse pulls need one.

## Muse providers: Gemini, Ollama, or LM Studio

The muse can run against the hosted Gemini API or fully local models — set `MUSE_PROVIDER` in `.env.local`:

| Provider | Setup | Default endpoint / model |
|---|---|---|
| `gemini` (default) | `GEMINI_API_KEY` from [AI Studio](https://aistudio.google.com/apikey) | `gemini-2.5-flash` |
| `ollama` | `ollama serve` + `ollama pull llama3.2` | `http://localhost:11434`, `llama3.2` |
| `lmstudio` | Load a model, start the local server | `http://localhost:1234`, whatever is loaded |

Optional overrides: `MUSE_MODEL` (model tag/name) and `MUSE_LOCAL_URL` (non-default host/port). Local providers speak the OpenAI-compatible `/v1/chat/completions` API, need no key, and nothing leaves your machine. Reasoning models (deepseek-r1, qwen3, …) work — `<think>` blocks are stripped before the output guard runs.

## Local Markdown vault

The writing experience saves notes locally as Markdown.

- Default vault: `./notes/`
- Current note: `notes/<title>.md`
- Manual snapshots: `notes/.versions/<note-slug>/<timestamp>.md`

You can point the app at another local folder later with:

```bash
MUSE_VAULT_DIR="/path/to/ObsidianVault/Margin Muse" npm run dev
```

This is intended for trusted local runs. Do not expose the local file API routes publicly.

## Put it on your taskbar

Margin Muse is an installable PWA backed by a local server that starts at login. On macOS:

```bash
bash scripts/autostart/install-macos.sh   # serves http://localhost:3323 at every login
```

Then open that URL and install it (Chrome/Edge: install icon in the address bar; Safari: File → Add to Dock…) — you get a dock/taskbar icon that opens Margin Muse in its own window. Windows and Linux instructions, port changes, and uninstall: [`docs/local-install.md`](docs/local-install.md).

To have your notes on every machine, set `MUSE_VAULT_DIR` to a cloud-synced folder (iCloud/Dropbox/Obsidian vault).

Other commands:

```bash
npm test         # Vitest unit tests (vault, markdown, personas, validation, providers, sound, storage)
npm run build    # production build / type-check
```

Without a configured provider, the paper surface, focus depth, sound, tones, and persistence all work; only the muse pull will report that the muse is unavailable (the editor never wedges).

## Architecture

- `app/page.tsx` — two-column shell, owns tone / notes / loading / sound state.
- `app/api/muse/route.ts` — validates the persona and input bounds, calls the configured provider, runs the output through the guard.
- `lib/muse-provider.ts` — provider abstraction: Gemini (hosted) or Ollama / LM Studio (local, OpenAI-compatible endpoint). API keys live only here and in env.
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
