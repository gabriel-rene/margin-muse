# Security

## Secrets

- The only secret is `ANTHROPIC_API_KEY`. It is read **server-side only**, in
  `app/api/muse/route.ts` via `process.env`, and is never sent to the browser.
- It lives in `.env.local`, which is gitignored (`.env*.local`) and has never
  been committed. Use `.env.example` as the template.
- No keys, tokens, or private keys exist anywhere in the tracked source or git
  history.

## The muse API route

`POST /api/muse` is an unauthenticated proxy to the paid Anthropic API. It is
hardened against abuse and resource exhaustion:

- Rejects bodies larger than 64 KB (`413`) before parsing.
- Type-checks every field and validates `persona` against an allow-list.
- Caps the selected `text` (8 KB) and the context window actually sent to the
  model (3 KB).
- `max_tokens` is fixed at 200 — the output is a single question.
- The model output is run through `lib/muse-validation.ts`, which rejects
  replacement-copy and over-long responses.

**If you deploy this publicly, add authentication and/or rate limiting** in
front of `/api/muse` (e.g. per-IP limits via a KV/Redis store, or an auth
gate). Without it, anyone can drive your API spend. This is intentionally out
of scope for the local-first v1.

## HTTP headers

`next.config.mjs` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options:
DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
`Permissions-Policy`, and disables `X-Powered-By`. A Content-Security-Policy is
not yet set — the paper surface and Tiptap use inline styles, so a CSP needs
careful tuning (likely a nonce) before it can ship without breaking rendering.

## Dependency advisories

`npm audit` reports advisories in Next.js 14's transitive dependencies. The
only fix offered is a major `next@14 → 16` upgrade, which is a breaking
migration and is **not** bundled here. Assessment for this app's actual usage:

- **Not applicable:** the Image Optimizer, middleware/proxy, i18n, CSP-nonce,
  `beforeInteractive`-script, and WebSocket-upgrade advisories — this app uses
  none of those features (`next/image`: 0 uses, no `middleware.ts`, no Server
  Actions, no WebSockets, no CSP nonces).
- **Build/dev-only:** the `postcss` stringify XSS (no user-authored CSS) and
  the `glob` CLI command-injection (an eslint-tooling devDependency, not a
  runtime path).
- **Residual, low-risk:** a couple of React Server Component DoS request shapes
  that are only reachable against a deployed instance.

The clean fix is the Next 16 migration, tracked as a follow-up so it can be
done deliberately with a full re-test rather than as a blind `--force` bump on
working code.

## Reporting

Open a GitHub issue, or for anything sensitive, contact the maintainer
directly rather than filing a public issue.
