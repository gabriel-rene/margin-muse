# Local Markdown Vault And Focused Workspace Design

Date: 2026-06-29

## Goal

Add local file management, manual versioning, Markdown persistence, and discoverable rich-text controls while preserving Margin Muse's central feeling: the writer is working on a quiet sheet of paper, and everything else recedes.

This design is optimized for local run. It is not a public multi-user storage design.

## Decisions

- Use a local folder-backed vault.
- Default vault path is `./notes/`.
- Future path override is `MUSE_VAULT_DIR=/path/to/vault`.
- Each main writing document is one Markdown note.
- Muse questions travel with the document instead of becoming independent files.
- Autosave updates the current Markdown file.
- Manual "Save Version" creates timestamped snapshots.
- Rich text uses Tiptap as the editing source of truth and Markdown as the persisted local format.
- The visual direction is the layered desk workspace: focused paper sheet in front, files and versions in softer background layers.
- The formatting toolbar is centered, floating, hidden by default, and revealed from a tiny icon with a simple smooth animation.

## Non-Goals

- No cloud sync.
- No database.
- No multi-user collaboration.
- No Git-backed versioning in v1.
- No automatic snapshot on every keystroke.
- No full Obsidian plugin or workspace integration.
- No file writes outside the configured vault.

## User Experience

The first screen remains the writing surface, not a file manager. The document is visually framed as a centered paper sheet with a stable page-like ratio. Around it, the background behaves like a softened desk:

- Left background layer: local notes list.
- Right background layer: versions for the current note.
- Center foreground: current paper sheet, editor, title, and muse rail.
- Bottom or low-priority control layer: paper tone and sound controls.

The texture should become richer without competing with prose:

- Increase current paper grain opacity by about 25%.
- Add a separate background grain layer behind the sheet.
- Blur and lower contrast on the background texture so the paper remains sharp.
- Give the sheet a subtle depth shadow and a crisp inner paper edge.

### Note Title

Each note has an editable title field above the prose. The title drives the filename after sanitization.

When the title is blank, the UI shows an untitled state and the backend uses a generated filename such as:

```text
untitled-2026-06-29-130422.md
```

Renaming behavior:

- On first save, title determines the filename.
- On later title changes, the app may rename the Markdown file if there is no conflict.
- If a conflict exists, append a short suffix.
- Existing versions remain under the note's stable note id, not only the title slug.

## File Layout

Default:

```text
notes/
  my-note-title.md
  another-note.md
  .versions/
    my-note-title/
      2026-06-29T13-04-22.md
      2026-06-29T14-18-03.md
```

Future configurable path:

```text
MUSE_VAULT_DIR=/Users/name/Documents/ObsidianVault/Margin Muse
```

The code should centralize vault-path resolution so changing from `./notes/` to `MUSE_VAULT_DIR` does not touch UI code.

## Markdown File Format

Each note is an Obsidian-friendly Markdown file with YAML frontmatter.

```markdown
---
id: 2026-06-29-130422-my-note-title
title: My Note Title
created: 2026-06-29T13:04:22.000Z
updated: 2026-06-29T13:12:48.000Z
version: current
---

# My Note Title

Body text generated from the Tiptap document.

## Muse Notes

### 2026-06-29 13:09 - Skeptic

> What backs the claim that this audience already understands the premise?
```

Rules:

- Frontmatter is machine-owned.
- Body Markdown is user-authored content.
- Muse notes are appended under `## Muse Notes`.
- If no muse notes exist, omit the section or keep it empty; implementation can choose the simpler path.
- The `# Title` heading should mirror the title field unless the implementation chooses title-only frontmatter for v1. Prefer mirroring for Obsidian readability.

## Versioning

Autosave writes the current note file only. It does not create a snapshot.

The user can click "Save Version" to create a timestamped Markdown copy of the current note.

Version filenames use sortable local-safe timestamps:

```text
2026-06-29T13-04-22.md
```

Version UI:

- Right background layer lists versions for the active note.
- Each version row shows timestamp and optional title at snapshot time.
- First implementation milestone includes snapshot creation and version listing.
- Restore-from-version is a follow-up unless it fits cleanly after the core save/list/snapshot flow is stable.

Restore behavior, when implemented:

- Confirm before replacing current content.
- Before restore, create a safety snapshot of the current note.
- Load restored content into Tiptap and write it to the current Markdown file.

## Data Flow

### Loading

1. Browser requests note list from local API.
2. API reads vault directory and returns note metadata.
3. Browser opens selected note.
4. API reads Markdown.
5. Markdown parser converts Markdown to Tiptap content.
6. Editor renders the Tiptap document.

### Autosave

1. User edits title or body.
2. Editor updates Tiptap state.
3. Debounced save sends note id, title, Tiptap content, and muse notes to local API.
4. API serializes Tiptap content to Markdown.
5. API writes the current `.md` file atomically.
6. UI shows a quiet saved timestamp.

### Manual Snapshot

1. User clicks "Save Version".
2. Browser requests snapshot for active note.
3. API serializes current note state.
4. API writes `notes/.versions/<note-slug>/<timestamp>.md`.
5. UI refreshes the version list.

## API Design

These routes are local-only filesystem routes under `app/api`.

```text
GET    /api/notes
POST   /api/notes
GET    /api/notes/:id
PUT    /api/notes/:id
POST   /api/notes/:id/versions
GET    /api/notes/:id/versions
```

Route contracts:

- `GET /api/notes`: list notes with id, title, slug, updated, created.
- `POST /api/notes`: create a new note with optional title.
- `GET /api/notes/:id`: return note metadata, Tiptap content, Markdown, and muse notes.
- `PUT /api/notes/:id`: save title, Tiptap content, and muse notes.
- `POST /api/notes/:id/versions`: create manual snapshot from current state.
- `GET /api/notes/:id/versions`: list version metadata.

Local-only guard:

- These routes should be documented as local-run features.
- Do not allow arbitrary path input from the client.
- Resolve all paths through a vault utility.
- Ensure resolved paths remain inside the vault root.
- Sanitize slugs.

## Markdown Serialization

Tiptap remains the editing source of truth; Markdown is the storage format.

Implementation should add a small Markdown conversion layer:

```text
lib/markdown.ts
```

Responsibilities:

- Convert supported Tiptap document nodes to Markdown.
- Convert Markdown files back into supported Tiptap content.
- Preserve the v1 supported formatting set.
- Leave unsupported Markdown as plain text or degrade gracefully.

Supported v1 formatting:

- Paragraphs.
- Heading levels 1-3.
- Bold.
- Italic.
- Bullet list.
- Ordered list.
- Blockquote.
- Link if low-friction with current Tiptap extensions.

If Markdown round-trip complexity grows, add `prosemirror-markdown` or a Tiptap-compatible Markdown extension deliberately. Do not hand-roll a broad Markdown parser.

## Rich Text UI

Use the existing Tiptap foundation.

Toolbar:

- Hidden by default behind a tiny centered icon near the top of the sheet.
- Click reveals a centered floating toolbar.
- Smooth simple animation: opacity plus small vertical translate.
- Toolbar closes when the user clicks away or presses Escape.
- Toolbar buttons use icon-like labels or real icons where available.

Controls:

- Bold.
- Italic.
- Heading.
- Bullet list.
- Ordered list.
- Blockquote.
- Undo.
- Redo.
- Link only if it can stay compact.

Keyboard behavior:

- `Cmd/Ctrl+B` toggles bold.
- `Cmd/Ctrl+I` toggles italic.
- `Cmd/Ctrl+Z` undo.
- `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` redo.
- Keep Tiptap/StarterKit Markdown-style input rules such as headings and lists.

Toolbar state:

- Active formatting states should be visible but quiet.
- Disabled undo/redo should be visibly muted.
- Buttons need accessible labels.

## Component Plan

New or changed components:

- `WorkspaceShell`: owns the layered desk layout.
- `NotesPanel`: left background layer for local notes.
- `VersionsPanel`: right background layer for manual snapshots.
- `TitleField`: editable note title above the paper body.
- `EditorToolbar`: centered floating formatting controls.
- `Editor`: accepts current note content and save callbacks instead of owning only localStorage persistence.
- `MarginRail`: stays near the paper, not in the blurred background.

Existing storage module:

- Keep `lib/storage.ts` temporarily for migration/fallback.
- Introduce filesystem-backed `lib/vault.ts` for server-side local files.
- Avoid calling filesystem utilities from client components.

## Migration From Current LocalStorage

On first run after this feature lands:

- If no vault notes exist and `localStorage` has a document, offer to create a note from the existing local document.
- Do not silently delete localStorage.
- After successful import, future saves use the vault.

This can be minimal in v1: a one-time "Import current draft" affordance is enough.

## Error Handling

- If the vault path is unavailable, show a calm local-file error and keep editing in memory.
- If saving fails, preserve unsaved editor state and show "not saved" state.
- If a title conflicts, resolve with a suffix rather than blocking writing.
- If Markdown parsing fails, show raw Markdown as plain text or offer a read-only fallback.
- If version snapshot fails, do not affect the current note save.

## Testing

Unit tests:

- Slug generation.
- Vault path resolution and path traversal rejection.
- Markdown serialization for supported formatting.
- Markdown parse round-trip for supported formatting.
- Version filename generation.
- Frontmatter generation and parsing.

API tests:

- Create note.
- List notes.
- Save note.
- Snapshot note.
- Reject invalid ids.
- Keep writes inside vault root.

Component tests:

- Toolbar opens/closes.
- Toolbar buttons call Tiptap commands.
- Keyboard shortcuts still work.
- Notes panel selects a note.
- Versions panel triggers manual snapshot.

Manual smoke test:

- Create titled note.
- Type rich text.
- Confirm `notes/<title>.md` exists.
- Open file in a Markdown viewer or Obsidian.
- Save version.
- Confirm timestamped version file exists.
- Restart dev server and reload note.

## Open Implementation Choices

These should be decided during implementation, not re-litigated at product level:

- Exact Markdown conversion library.
- Exact toolbar icon set.
- Whether `# Title` is generated as body heading or only represented in frontmatter. Prefer generated heading unless it creates awkward editor duplication.

## Approved Direction

Use Tiptap-first editing with Markdown persistence, folder-backed local notes, manual snapshots, centered floating rich-text toolbar, and a layered desk workspace with a sharper paper sheet over softer file/version layers.
