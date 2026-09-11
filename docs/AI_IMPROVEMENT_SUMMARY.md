# Astra — Campaign Experience Review and Release Priorities

Reviewed and refreshed on 2026-09-11. This is the current player-facing improvement plan. The original live review covered character creation, a completed AI turn, desktop/mobile inspection and source review; subsequent work on the same day implemented the first two priority fixes and a repository-wide engineering hardening pass.

## Direction

Make Astra feel like a continuous, consequential solo campaign. Preserve the dark green/gold presentation, opening mystery and freedom to attempt creative actions. The AI improvises fiction; deterministic/server code owns consequential game truth.

## Implemented from the review

### ✅ Story-first mobile play

The original review found the story and action composer far below character/inventory/tooling content on narrow screens. Mobile/tablet layouts now place the adventure article before the character sheet. Playwright regressions verify the rendered order at 390 × 844 and 800 × 900 rather than merely checking CSS text.

### ✅ Ordinary conversation no longer creates arbitrary persuasion checks

The original opening test turned “ask the woman about her daughter” into a CHA check. Adjudication now has an explicit policy boundary: ordinary information-seeking is converted to a no-roll action, while persuasion, deception, intimidation, coercion and other genuine influence attempts may still require checks. Unit tests and the production smoke test protect this behaviour.

### ✅ Reliability foundation strengthened

The 26-principle repository audit added stricter state/model/import validation, server-authoritative spatial/reachability state, tactical request idempotency, deterministic installs/tooling, privacy-safe diagnostics and explicit signed-save boundaries. See [CODE_PRINCIPLES.md](CODE_PRINCIPLES.md) and [PRINCIPLES_AUDIT.md](PRINCIPLES_AUDIT.md).

## Next player-facing priorities

### 1. Connect tactical combat to narrative encounters

**Current state:** Tactical combat is a signed server-authoritative engine with movement, reachability, Dash, Disengage, opportunity attacks, range, cover, HP/AC and enemy turns. However, the player still starts a tactical encounter manually and names the foe.

**Next change:** Let narrative encounters create explicit server-owned encounter state and appropriate opponents automatically. Victory, surrender, escape, injuries, rewards and NPC/quest consequences should feed back into the same campaign state and next narration.

**Acceptance:** A fight arising naturally in the story can be completed without manually inventing the opponent. Character resources and outcomes agree between narration, character sheet and grid; retries cannot apply consequences twice; surrender and escape are valid outcomes.

### 2. Give XP a purpose

**Current state:** XP is tracked but characters remain mechanically level 2.

**Next change:** Build a small complete progression arc, initially levels 2–5, with server-authoritative thresholds and class-specific benefits. Existing v3 saves must migrate safely and threshold rewards must apply exactly once.

**Acceptance:** The UI shows progress to the next unlock; crossing a threshold grants deterministic benefits once; save/backup/restore preserves them.

### 3. Preserve a complete readable chronicle

**Current state:** AI context intentionally carries only bounded recent history plus memory/facts/lists. This protects cost and context size, but the signed campaign does not yet retain a complete player-readable chronicle indefinitely.

**Next change:** Store the complete readable chronicle separately from bounded model context. Keep NPCs, promises and quests structured with stable identities/status. Start with deterministic lookup; only add embeddings if measured retrieval quality requires them.

**Acceptance:** Earlier scenes remain readable after long play. A named NPC, promise and resolved quest survive a long campaign plus export/restore without bloating every model request.

### 4. Make turn delivery smoother and more accessible

**Current state:** The browser now appends new transcript entries rather than rebuilding the ARIA live log and preserves scroll position while someone reads older text. Server turns are still returned as complete responses rather than streamed narration.

**Next change:** If streaming is introduced, treat displayed partial narration as provisional and commit authoritative state only after the complete structured result validates.

**Acceptance:** Interrupted/invalid turns preserve the previous save; screen readers do not re-announce old transcript content; reading older text is not forcibly interrupted; any partial text is clearly non-authoritative until commit.

## One excellent 20-minute opening adventure

Use the opening arc as the integration test for future product work. A player should be able to:

1. Meet the woman and obtain a clue through several plausible approaches.
2. Travel somewhere memorable and see the location reflected in the signed map and story.
3. Resolve a meaningful encounter through combat, negotiation or escape.
4. Earn a meaningful reward and progress toward an unlock.
5. Return to discover that choices changed an NPC, quest or location.
6. Save, restore and resume with those consequences intact.

This should remain open-world rather than a forced route. New breadth should wait until these existing systems work together cleanly.

## Order of work

1. Narrative ↔ tactical encounter integration.
2. Levels 2–5 progression and durable chronicle/structured campaign memory.
3. Accessible progressive turn delivery only if it preserves atomic state commits.
4. Restrained atmospheric art and outcome feedback, then broader content expansion.

The historical [IMPROVEMENTS.md](IMPROVEMENTS.md) remains useful research context, but this document is the current product priority source of truth.
