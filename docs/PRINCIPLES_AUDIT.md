# Principles Audit

Repository-wide inventory of every tracked file against `docs/CODE_PRINCIPLES.md`.

**Scope and honesty note.** The per-file rows below record structural responsibility and
the status of the invariants that are *mechanically* checked by `qa/principles.cjs`
(dependency pinning, boundary validation, secret hygiene, layer direction, client/server
domain parity, accessibility gates). They are not a line-by-line human review of all 26
principles for all files. Rows marked 🟡 are ones where a real issue was observed and is
not yet fixed. Rows marked ✅ mean "no violation observed and the automated invariants
covering this file pass" — not "certified perfect".

Legend: ✅ compliant · 🟡 improvement wanted · 🔴 violation · N/A principle not applicable.

`qa/principles.cjs` asserts that every tracked file appears in this document. That
assertion is deliberately cheap bookkeeping, not a quality signal — see *Known issues*.

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
| `server/model-output.cjs` | Validates model output, bounded single repair attempt, fallback model | ✅ |
| `server/groq.cjs` | Provider transport: keys, retries, timeouts, error classification | 🟡 largest server module (208 lines); transport, key rotation and error mapping could be split |
| `server/tactical.cjs` | Tactical/spatial resolution and reachability | ✅ |
| `server/spatial.cjs` | Exploration graph and movement geometry | ✅ |
| `server/http.cjs` | Shared request/response helpers, headers, method guards | ✅ |
| `server/secret.cjs` | Save signing secret handling; server-only | ✅ |

## Browser client (`dist`)

| File | Responsibility | Status |
| --- | --- | --- |
| `dist/index.html` | App shell and module load order (validator loads first) | 🟡 single-line file; load-order correctness is asserted by test rather than readable in source |
| `dist/classic.html` | Classic presentation shell | 🟡 single-line file |
| `dist/app.js` | UI wiring and turn submission | ✅ |
| `dist/engine.js` | Client presentation of class data; must not diverge from `server/classes.cjs` | ✅ parity-tested |
| `dist/world.js` | Client-side world rendering and story pane | ✅ |
| `dist/state-validation.js` | Zero-trust validation of campaign/save data before UI touches it | ✅ |
| `dist/extras.js` | Campaign tools; explicitly must not patch global `fetch` | ✅ asserted |
| `dist/aidm-port.js` | Tactical map UI | ✅ |
| `dist/sw.js` | Offline shell; caches the validator | ✅ |
| `dist/style.css` | Base styles incl. `prefers-reduced-motion` | 🟡 2-line minified file; N/A for UI/logic separation |
| `dist/extras.css` | Campaign tool styles | N/A |
| `dist/aidm-port.css` | Tactical map styles | N/A |
| `dist/manifest.webmanifest` | PWA manifest | N/A |
| `dist/icon.svg` | App icon | N/A |

## Tests and QA

| File | Responsibility | Status |
| --- | --- | --- |
| `test.cjs` | Core unit checks | ✅ |
| `test-world.cjs` | World-state behaviour | ✅ |
| `test-api.cjs` | Turn API behaviour with a stubbed provider; no live network calls | 🟡 dense single-line statements make failures hard to localise |
| `qa/rules.cjs` | Rules-engine behaviour | ✅ |
| `qa/adjudication.cjs` | Fail-closed adjudication validation | ✅ |
| `qa/tactical-api.cjs` | Tactical boundary validation and idempotent retries | ✅ |
| `qa/dom.cjs` | jsdom playtest of the full peaceful route | ✅ |
| `qa/crossrepo.cjs` | Cross-repo module contract checks | 🟡 evaluates browser bundles inside Node via `eval`; brittle to load-order changes |
| `qa/crossrepo-browser.cjs` | Same contracts in a real browser | ✅ |
| `qa/aidm-upgrade.cjs` | AIDM feature-port behaviour | ✅ |
| `qa/aidm-port.cjs` | AIDM port contract | ✅ |
| `qa/aidm-port-browser.cjs` | AIDM port in a real browser | ✅ |
| `qa/browser.cjs` | Chromium end-to-end game flow | ✅ |
| `qa/mobile-story-first.cjs` | 390/800px story-first layout regression | ✅ |
| `qa/live-smoke.cjs` | Post-deploy production smoke test | ✅ |
| `qa/principles.cjs` | Machine-checkable engineering invariants | 🟡 see *Known issues* — couples deploys to this document |

## Build, config and docs

| File | Responsibility | Status |
| --- | --- | --- |
| `package.json` | Scripts and pinned dev dependencies | ✅ |
| `package-lock.json` | Deterministic installs (`npm ci`) | ✅ |
| `vercel.json` | Install/build command, security headers, function config | 🟡 `buildCommand` runs the whole test suite, so any test failure is a deploy failure |
| `.github/workflows/qa.yml` | CI gate: pinned actions, `npm ci`, unit/API, browser, live smoke | ✅ |
| `dev.cjs` | Local dev server mirroring the production API surface | ✅ |
| `.env.example` | Documents required environment variables; no real secrets | ✅ |
| `.gitignore` | Keeps secrets and build noise out of version control | ✅ |
| `README.md` | Project overview and how to run | ✅ |
| `docs/CODE_PRINCIPLES.md` | The 26 principles themselves | ✅ |
| `docs/PRINCIPLES_AUDIT.md` | This document | ✅ |
| `docs/IMPROVEMENTS.md` | Running change log | 🟡 885 lines; append-only history rather than current-state documentation |
| `docs/AI_IMPROVEMENT_SUMMARY.md` | Narrative summary of AI behaviour work | ✅ |

## Known issues

1. **`qa/principles.cjs` gates deploys on documentation bookkeeping.** It asserts every
   tracked file is named in this document. Adding any file therefore breaks the build
   until this markdown is edited. That is enforcement of paperwork, not behaviour, and it
   sits awkwardly beside principle 15 (*tests protect behaviour, not implementation*).
   Recommended: keep the invariant checks, drop or downgrade the file-inventory assertion
   to a warning.
2. **`vercel.json` uses `npm test` as its build command.** `.github/workflows/qa.yml`
   already runs the same suite on `main`, `qa/**`, `upgrade/**` and `audit/**`. Running it
   again at deploy time means every red test destroys the preview URL as well, which is
   what buried the `audit/26-principles-compliance` branch under failed deployments.
3. **Dense single-line source style** in `qa/principles.cjs`, `test-api.cjs` and parts of
   `dist` makes diffs and stack traces hard to read, working against principles 4, 5 and
   13.
