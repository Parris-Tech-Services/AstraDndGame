# Principles Audit

Repository-wide inventory against `docs/CODE_PRINCIPLES.md`.

**Scope and honesty note.** The rows below record structural responsibility and the status of invariants that are mechanically checked by `qa/principles.cjs` (dependency pinning, boundary validation, secret hygiene, layer direction, client/server domain parity and accessibility gates). They are not a claim that every line is mathematically certifiable against every principle. Rows marked 🟡 are places where a real maintainability improvement remains. Rows marked ✅ mean no violation was observed for the file's applicable principles and the relevant automated invariants pass.

Legend: ✅ compliant · 🟡 improvement wanted · 🔴 violation · N/A principle not applicable.

The audit document is deliberately **not** a deployment gate. `qa/principles.cjs` verifies behavioural and architectural invariants; it does not fail merely because a new tracked filename has not yet been added to this markdown.

## Serverless API boundary

| File | Responsibility | Status |
| --- | --- | --- |
| `api/turn.js` | HTTP entry for a narrative turn; method/origin guard, request-id idempotency, error mapping | ✅ |
| `api/tactical.js` | HTTP entry for tactical actions; validated, idempotent, server-authoritative | ✅ |

## Server domain (source of truth)

| File | Responsibility | Status |
| --- | --- | --- |
| `server/rules.cjs` | Canonical rules: origins, backgrounds, tones, checks | ✅ |
| `server/classes.cjs` | Canonical class definitions; parity-tested against `dist/engine.js` | ✅ |
| `server/world.cjs` | World state shape and transitions | ✅ |
| `server/turn-contract.cjs` | Schema/contract a model turn must satisfy before it is trusted | ✅ |
| `server/adjudication.cjs` | Decides whether an action needs a roll; engine owns the outcome | ✅ |
| `server/model-output.cjs` | Validates model output, bounded repair attempt and fallback model | ✅ |
| `server/groq.cjs` | Provider transport: keys, retries, timeouts, error classification | 🟡 largest server module; transport, key-pool policy and error mapping could be split further |
| `server/tactical.cjs` | Tactical/spatial resolution and reachability | ✅ |
| `server/spatial.cjs` | Exploration graph and movement geometry | ✅ |
| `server/http.cjs` | Shared request/response helpers, headers and rate-limit helpers | ✅ |
| `server/secret.cjs` | Save-signing secret handling; server-only | ✅ |

## Browser client (`dist`)

| File | Responsibility | Status |
| --- | --- | --- |
| `dist/index.html` | App shell and module load order; validator loads first | 🟡 compact/minified source reduces human readability |
| `dist/classic.html` | Classic presentation shell | 🟡 compact/minified source reduces human readability |
| `dist/app.js` | Classic UI wiring, validated local save loading and persistence | ✅ |
| `dist/engine.js` | Classic adventure rules/story graph and client presentation of class data | 🟡 legacy helper naming and dense structure could be clearer even though behaviour is covered |
| `dist/world.js` | Open-world rendering, turn submission and signed campaign flow | ✅ |
| `dist/state-validation.js` | Zero-trust validation of campaign/save data before UI touches it | ✅ |
| `dist/extras.js` | Campaign tools with explicit validated data flow; does not patch global `fetch` | ✅ |
| `dist/aidm-port.js` | Tactical map UI using server-authored tactical state/reachability | ✅ |
| `dist/sw.js` | Offline shell; caches the validator | ✅ |
| `dist/style.css` | Base responsive/accessibility styles incl. `prefers-reduced-motion` | 🟡 minified source reduces maintainability |
| `dist/extras.css` | Campaign tool styles | N/A |
| `dist/aidm-port.css` | Tactical map styles | N/A |
| `dist/manifest.webmanifest` | PWA manifest | N/A |
| `dist/icon.svg` | App icon | N/A |

## Tests and QA

| File | Responsibility | Status |
| --- | --- | --- |
| `test.cjs` | Classic rules and playthrough checks | ✅ |
| `test-world.cjs` | World-state, signing and provider-recovery behaviour | ✅ |
| `test-api.cjs` | Turn API behaviour with a stubbed provider; no live Groq dependency | 🟡 dense formatting makes failures harder to localise |
| `qa/build-sanity.cjs` | Deterministic Vercel build sanity: required deployment files/config only | ✅ |
| `qa/rules.cjs` | Rules-engine behaviour | ✅ |
| `qa/adjudication.cjs` | Fail-closed adjudication validation | ✅ |
| `qa/tactical-api.cjs` | Tactical boundary validation and idempotent retries | ✅ |
| `qa/dom.cjs` | jsdom playtest including persistence/corrupt-save recovery | ✅ |
| `qa/crossrepo.cjs` | Browser-module contract checks in jsdom/Node | 🟡 still somewhat sensitive to browser-module load structure |
| `qa/crossrepo-browser.cjs` | Cross-feature contracts in a real browser | ✅ |
| `qa/aidm-upgrade.cjs` | AI-DM upgrade behaviour | ✅ |
| `qa/aidm-port.cjs` | Tactical/AIDM port contract | ✅ |
| `qa/aidm-port-browser.cjs` | Tactical/AIDM port in a real browser | ✅ |
| `qa/browser.cjs` | Chromium end-to-end game flow | ✅ |
| `qa/mobile-story-first.cjs` | 390/800px story-first layout regression | ✅ |
| `qa/live-smoke.cjs` | Post-deploy production smoke test | ✅ |
| `qa/principles.cjs` | Machine-checkable engineering invariants; behaviour/architecture, not filename bookkeeping | ✅ |

## Build, config and docs

| File | Responsibility | Status |
| --- | --- | --- |
| `package.json` | Explicit build/test/start scripts and pinned dev dependencies | ✅ |
| `package-lock.json` | Deterministic installs (`npm ci`) | ✅ |
| `vercel.json` | Deterministic install, lightweight build sanity, security headers and function config | ✅ |
| `.github/workflows/qa.yml` | Full QA gate: pinned actions, `npm ci`, unit/API, browser and production smoke | ✅ |
| `dev.cjs` | Local dev server mirroring the production turn+tactical API surface | ✅ |
| `.env.example` | Documents required environment variables; no real secrets | ✅ |
| `.gitignore` | Keeps secrets and dependency/build noise out of version control | ✅ |
| `README.md` | Current architecture, limits, privacy and operational behaviour | ✅ |
| `docs/CODE_PRINCIPLES.md` | The 26 engineering principles | ✅ |
| `docs/PRINCIPLES_AUDIT.md` | This audit and its limitations | ✅ |
| `docs/IMPROVEMENTS.md` | Historical backlog/research context | 🟡 large historical document; current priorities live elsewhere |
| `docs/AI_IMPROVEMENT_SUMMARY.md` | Current player-facing improvement priorities | ✅ |

## Resolved during this audit

- Vercel previews no longer rerun the entire QA suite. `npm run build` performs deterministic deployment sanity only; GitHub Actions remains the full QA gate.
- `qa/principles.cjs` no longer fails releases because a markdown inventory missed a filename; it enforces actual architectural and behavioural invariants.
- The previously missing `docs/PRINCIPLES_AUDIT.md` now exists, so the ENOENT deployment failure is removed.
- Turn API tests use a stubbed provider. Simulated `502 invalid_model_output` and `429 rate_limit` diagnostics are test cases, not live Groq calls.

## Remaining maintainability work

The remaining 🟡 items are readability/maintainability debt rather than known production-safety violations: the provider module is still large, several legacy/static files are densely formatted, the classic engine contains legacy terse naming, and the historical backlog is intentionally long. These should be cleaned in bounded refactors with behaviour tests preserved rather than rewritten purely to make this table green.
