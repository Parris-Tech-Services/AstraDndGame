# Principles Audit

Repository-wide inventory against `docs/CODE_PRINCIPLES.md`.

**Scope and honesty note.** The rows below record structural responsibility and the status of invariants that are mechanically checked by `qa/principles.cjs` (dependency pinning, boundary validation, secret hygiene, layer direction, client/server domain parity and accessibility gates). They are not a claim that every line is mathematically certifiable against every principle. Rows marked 🟡 are places where a real maintainability or infrastructure improvement remains. Rows marked ✅ mean no known violation remains for the file's applicable principles and the relevant automated invariants pass.

A deeper manual audit is being performed separately by phase. The 2026-09-11 phase covering all `server/` and `api/` files found the HP split-brain and signing-secret coupling described below; those findings are now regression-tested. Later phases must not be inferred as complete from this inventory.

Legend: ✅ compliant · 🟡 improvement wanted · 🔴 violation · N/A principle not applicable.

The audit document is deliberately **not** a deployment gate. `qa/principles.cjs` verifies behavioural and architectural invariants; it does not fail merely because a new tracked filename has not yet been added to this markdown.

## Serverless API boundary

| File | Responsibility | Status |
| --- | --- | --- |
| `api/turn.js` | HTTP entry for a narrative turn; method/origin guard, request IDs, migration-safe save verification and error mapping | 🟡 exact idempotency remains per-instance rather than distributed |
| `api/tactical.js` | HTTP entry for tactical actions; validated, signed, server-authoritative | 🟡 exact idempotency remains per-instance rather than distributed |

## Server domain (source of truth)

| File | Responsibility | Status |
| --- | --- | --- |
| `server/rules.cjs` | Canonical rules: origins, backgrounds, tones, checks | ✅ |
| `server/classes.cjs` | Canonical class definitions; parity-tested against `dist/engine.js` | ✅ |
| `server/world.cjs` | World state shape and transitions | 🟡 `resolve`/`apply` remain dense and should be split in a bounded refactor |
| `server/turn-contract.cjs` | Schema/contract a model turn must satisfy before it is trusted | ✅ |
| `server/adjudication.cjs` | Decides whether an action needs a roll; engine owns the outcome | ✅ |
| `server/model-output.cjs` | Validates model output, bounded repair attempt and fallback model | ✅ |
| `server/groq.cjs` | Ordered credential/model failover, bounded transport and redacted diagnostics | 🟡 still the largest server module and a candidate for bounded decomposition |
| `server/tactical.cjs` | Tactical/spatial resolution; campaign HP is authoritative and tactical hero HP is a projection | 🟡 safe clone-then-mutate implementation remains dense in places |
| `server/spatial.cjs` | Exploration graph and movement geometry | ✅ |
| `server/http.cjs` | Shared request/response helpers, trusted-proxy IP handling and rate-limit helpers | ✅ |
| `server/secret.cjs` | Signing keyring: explicit stable secret primary, previous/legacy verification fallbacks | 🟡 legacy provider-derived verification remains temporarily for migration compatibility |

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
| `qa/server-audit.cjs` | Deep-audit regressions for HP authority, signing migration, provider failover, transport causes and proxy trust | ✅ |
| `qa/rules.cjs` | Rules-engine behaviour | ✅ |
| `qa/adjudication.cjs` | Fail-closed adjudication validation | ✅ |
| `qa/tactical-api.cjs` | Tactical boundary validation and per-instance retry dedupe | ✅ |
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
| `.github/workflows/qa.yml` | Full QA gate on main/fix/qa/upgrade/audit branches; pinned actions, `npm ci`, browser and production smoke | ✅ |
| `dev.cjs` | Local dev server mirroring the production turn+tactical API surface | ✅ |
| `.env.example` | Documents provider credentials and explicit/previous signing-secret migration variables | ✅ |
| `.gitignore` | Keeps secrets and dependency/build noise out of version control | ✅ |
| `README.md` | Current architecture, failover, persistence limits, privacy and operational behaviour | ✅ |
| `docs/CODE_PRINCIPLES.md` | The 26 engineering principles | ✅ |
| `docs/PRINCIPLES_AUDIT.md` | This audit and its limitations | ✅ |
| `docs/IMPROVEMENTS.md` | Historical backlog/research context | 🟡 large historical document; current priorities live elsewhere |
| `docs/AI_IMPROVEMENT_SUMMARY.md` | Current player-facing improvement priorities | ✅ |

## Resolved during this audit

- Vercel previews no longer rerun the entire QA suite. `npm run build` performs deterministic deployment sanity only; GitHub Actions remains the full QA gate.
- `qa/principles.cjs` no longer fails releases because a markdown inventory missed a filename or because a documentation heading changed; it enforces actual architectural and behavioural invariants.
- The previously missing `docs/PRINCIPLES_AUDIT.md` now exists, removing the ENOENT deployment failure.
- Turn API tests use a stubbed provider. Simulated `502 invalid_model_output` and `429 rate_limit` diagnostics are test cases, not live Groq calls.
- Campaign `state.hp` is now authoritative during tactical play; tactical hero HP is re-derived before actions, so narrative potion/Second Wind/rest/death-save healing survives the next tactical hit.
- Signing policy now supports an explicit stable `DND_SESSION_SECRET` as primary and verifies previous/legacy signatures during migration so changing signing policy does not abruptly invalidate existing 30-day saves.
- Groq credentials are exhausted in configured order for availability failures (401/project permissions/network/timeout/upstream failures) within bounded model/deadline rules. A provider 429 remains organisation-rate-limit backoff rather than quota circumvention.
- Provider transport now preserves a safe failure cause discriminator, rejected keys recover after an expiry instead of remaining disabled for the whole process lifetime, and provider internal codes are not echoed to players.
- Origin-header absence and Vercel trusted-proxy assumptions are documented; direct/local connections use the socket address instead of trusting client-supplied forwarding headers.
- Preview deployments at and after the deterministic-build change have reached Vercel `READY`, confirming the repeated preview-failure chain is resolved.

## Remaining maintainability / infrastructure work

- Exact turn/tactical response idempotency and rate limiting are still **per Vercel function instance**. Signed saves bound the state being resolved, but true cross-instance request dedupe needs a shared durable store.
- `server/world.cjs` `resolve()` and `apply()` remain dense multi-responsibility functions. Split them only as a bounded behaviour-preserving refactor with the existing rule/API/browser suite green before and after.
- `server/groq.cjs` remains large even after provider health/failover was made explicit; transport, credential health and error mapping can be separated later without changing behaviour.
- The explicit signing migration is complete in code when production has `DND_SESSION_SECRET` configured. Until then the API reports `signingMode: legacy-provider-derived` and keeps compatibility; once explicit mode is live, retain legacy provider keys only for the existing 30-day save window.
- Several legacy/static files remain densely formatted, the classic engine contains terse legacy naming, and the historical backlog is intentionally long. Those are readability debts, not known production-safety failures.
