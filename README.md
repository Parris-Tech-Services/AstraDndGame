# The Bell Beneath Blackthorn

An original solo fantasy text adventure inspired by fifth-edition tabletop play. Built for Josh.

The default experience is a Groq-powered open-world campaign in the original Hollow Marches setting: choose a level-2 Fighter, Rogue or Wizard, attempt any plausible fictional action, travel beyond Blackthorn, invent goals and keep playing after quests resolve. The original authored adventure remains available at `/classic.html`.

## Play and develop

Run `npm start` and visit http://localhost:3000. Node 22+ is required. The local server exposes the same `/api/turn` and `/api/tactical` routes used in production. Open-world AI turns require the server-side configuration below; the classic adventure needs no API key.

Run `npm test` for deterministic rules, signed-state, server-audit, API, model-boundary, tactical-idempotency, DOM and engineering-principle checks. GitHub Actions adds Chromium playthroughs and the production branch adds a live deployment smoke test.

Deploy to Vercel with framework preset **Other** and output directory **dist**. `vercel.json` uses `npm ci`, runs a deterministic deployment-sanity build, supplies security headers and configures both API functions. Full behavioural/browser QA remains the GitHub Actions merge/release gate so a temporary test failure does not destroy every preview URL.

## Engineering standard

Astra is governed by the [26 engineering principles](docs/CODE_PRINCIPLES.md). The [principles audit](docs/PRINCIPLES_AUDIT.md) records the repository-wide structural/invariant pass and its limitations; deeper file-by-file audit work should be added without overstating unaudited areas. The most important AI-game rule is: **the engine owns truth; AI proposes fiction.**

## Current roadmap

The [campaign experience review](docs/AI_IMPROVEMENT_SUMMARY.md) records the 2026-09-11 live-play review and current priorities. Story-first mobile play and ordinary-conversation adjudication are implemented. The next large product work is narrative/tactical combat integration, progression, durable campaign history and smoother accessible turn delivery.

The broader [improvement backlog](docs/IMPROVEMENTS.md) is intentionally historical and partly superseded. Treat its entries as research context, not the current source of truth.

## Architecture

- `dist/index.html`: open-world page structure and character creation.
- `dist/state-validation.js`: canonical browser boundary validation for local saves, backups and API campaign responses.
- `dist/world.js`: open-world UI, local commands, retry/idempotency client flow and incremental transcript rendering.
- `dist/extras.js`: explicit campaign backup/restore, save slots, safe undo, read-aloud and display preferences.
- `dist/aidm-port.js`: world/tactical presentation; consequential movement/attacks are always resolved by the server.
- `dist/engine.js` / `dist/app.js` / `dist/classic.html`: self-contained authored classic adventure.
- `server/classes.cjs`: authoritative open-world class statistics used by server rules.
- `server/rules.cjs`: deterministic resources, conditions, damage, proficiency and death-save mechanics.
- `server/world.cjs`: versioned campaign state, signed saves, server dice, bounded state updates and prompt context.
- `server/spatial.cjs`: authoritative exploration graph projection.
- `server/tactical.cjs`: authoritative tactical grid, reachability, movement, actions, cover, range and enemy turns. Campaign `state.hp` is authoritative; tactical hero HP is a projection of it.
- `server/turn-contract.cjs`: bounded locally validated AI narration/state-update contract.
- `server/model-output.cjs`: one bounded repair/fallback path for malformed model output.
- `server/http.cjs`: shared request-body, origin, trusted-proxy, rate-limit and cache helpers.
- `server/secret.cjs`: campaign-signing keyring and migration policy.
- `server/groq.cjs`: ordered provider-credential failover, model fallback, organisation-rate-limit backoff and redacted diagnostics.
- `api/turn.js`: character creation and narrative turns.
- `api/tactical.js`: signed tactical operations with request-id best-effort per-instance idempotency.
- `qa/`: behaviour, browser, live-production and engineering-invariant regressions.

## Rules scope

This is a streamlined custom fifth-edition-inspired game, not a complete implementation of D&D. Open-world mode uses server-side cryptographic d20 rolls and bounded AI-authored fiction. Natural 20/1 special outcomes apply to attacks, not ordinary ability checks.

The AI Dungeon Master interprets creative intent and narrates consequences, but code remains authoritative for dice, checks, spell slots, potions, Fighter Second Wind, rest healing, attack damage, signed campaign state and tactical combat. Ordinary information-seeking does not become a persuasion check merely because dialogue occurred; influence, deception, intimidation or meaningful uncertainty may still call for a roll.

Fighters have a tracked Second Wind that heals `1d10 + 2` once and refreshes after a successful rest. Healing potions cannot be consumed at full HP. Wizards regain spell slots on a successful long rest. Rogues use a ranged Shortbow in tactical mode with the same d6 + DEX damage basis used by the core rules.

Open-world characters currently remain mechanically level 2 while XP is tracked for narrative progress. Tactical encounters are server-authoritative but are not yet created automatically from narrative encounters; integrating those two systems is a current roadmap item.

## Open-world state and persistence

The home page launches a free-text open-world campaign. A planning call decides whether one d20 test is needed; Node resolves any authoritative roll/resource consequence; a narration call receives that result and may propose only bounded, schema-validated world updates.

Only a completely validated turn replaces the previous save. The browser never receives provider keys. Campaign states are HMAC-signed and expire after 30 days without a successful turn. Saves, backup files and slot imports are validated before rendering. The current signed-state format is v3; missing fields from supported v3 saves are explicitly upgraded before validation.

Normal turns and tactical actions carry request IDs. Per-function-instance response caches make ordinary retries on the same warm instance return the same response. This is **not** distributed global idempotency: a retry routed to another Vercel instance can resolve the same signed pre-turn save again and therefore make another provider call. A larger multi-instance service should use durable shared idempotency/rate-limit storage.

## Server configuration

Configure these **server-side environment variables** in Vercel:

- `GROQ_API_KEY`: preferred primary Groq credential.
- `GROQ_API_KEYS`: optional JSON array (or comma-separated list) of additional authorised credentials used in order for availability failover.
- `DND_SESSION_SECRET`: stable primary campaign-signing secret of at least 32 characters/bytes. This should be configured explicitly and kept stable across deployments.
- `DND_SESSION_SECRET_PREVIOUS`: optional JSON array or comma-separated list of previous explicit signing secrets retained temporarily during a planned rotation.
- `GROQ_MODEL`: optional primary model, default `openai/gpt-oss-120b`.
- `GROQ_FALLBACK_MODEL`: optional model fallback, default `openai/gpt-oss-20b`.

During migration from older deployments, `server/secret.cjs` can still verify saves signed with the legacy Groq-key-derived secret while that Groq key remains configured. Once `DND_SESSION_SECRET` is present, all **new** saves use the explicit stable secret. Keep any legacy provider key needed for old-save verification until the 30-day save window has elapsed, then the provider-derived fallback can be removed in a later migration.

The repository contains no provider credentials. Keep all Groq keys and signing secrets in server environment variables only.

### Reliability and privacy

- Credentials are tried in configured order for availability. A 401 temporarily marks the rejected credential unhealthy; network failures, timeouts, 403 project/model differences and upstream 5xx responses can progress through fallback models/credentials within the bounded request deadline.
- A Groq 429 honours `Retry-After` and pauses the provider pool for that function instance. Groq documents organisation-level ceilings, so the app does not try to bypass a 429 by hopping API keys.
- Structured model output is validated locally before domain logic. One bounded repair attempt uses the configured fallback model; two invalid responses fail closed and preserve the prior save.
- Provider diagnostics retain safe status/code/type/cause/model/stage/retry metadata. Keys, provider response text, prompts, player actions and signed saves are not logged by the API diagnostic path, and provider codes are not echoed in player-facing errors.
- Action length, request body size, model context/output, histories, state arrays, caches, retries and network timeouts are bounded.
- Invalid browser saves and backups are discarded/rejected safely rather than rendered as trusted state.
- Gameplay sends the player's action and bounded campaign context to Groq. There is no browser-to-Groq connection.

## Attribution

This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Story, characters and setting are original. Rules have been adapted as described above. No official affiliation is claimed.
