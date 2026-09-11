# Astra — Campaign Experience Review and Release Priorities

Reviewed on 2026-09-11. This is the current player-facing improvement plan; all work
below is proposed unless explicitly identified as already implemented.

## Evidence and scope

The review covered character creation and one completed AI turn on the
[live game](https://astra-dnd-game.vercel.app/), desktop and 390 × 844 mobile browser
inspection, and source inspection of GitHub main at `220f190` and the local checkout
at `c67ae85`. The live status endpoint reported build `c67ae8550c1c`.
This was a focused review, not a full campaign playtest, accessibility audit or
verification of every existing feature. One AI response illustrates a design issue;
it does not establish how often the issue occurs.

## Direction and existing strengths

Make Astra feel like a continuous, consequential solo campaign. Preserve the dark
green and gold palette, typography, opening mystery and freedom to attempt creative
actions. The AI should improvise fiction while the engine owns consequential rules.

Several recommendations in the older [improvement backlog](IMPROVEMENTS.md) and the
previous version of this summary are outdated. The current implementation already has:

- A visual world map and a separate tactical combat engine with enemy HP and AC.
- Portable backup/restore and three local save slots.
- Restricted safe undo, rather than unrestricted rewind after revealing dice outcomes.
- Read-aloud, display preferences and ambient sound controls.

These features need integration and refinement, not duplicate implementations.
Relevant sources: [page structure](../dist/index.html), [campaign tools](../dist/extras.js),
[map and battle UI](../dist/aidm-port.js), and [tactical rules](../server/tactical.cjs).

## 1. Put the adventure first on mobile

**Observed:** At 390px wide, the story began roughly 2,040px below the viewport top
and the action input was around 2,737px down in the inspected play state. Character
statistics, inventory, quests and tools preceded the main play loop.

Put the story first on narrow screens, keep the action composer accessible, and move
character details, inventory, maps and campaign tools into tabs or drawers. Preserve
access to HP and important resource changes without requiring a long sidebar scroll.

**Acceptance:** A player can read the current scene and submit the next action without
scrolling through the character sheet. Verify with the mobile keyboard open, long
narration, large text, and keyboard navigation; controls must not obscure the story.

## 2. Make the DM sustain momentum

**Observed:** Choosing the opening suggestion to ask the woman about her daughter
triggered a CHA check: 4 + 0 against DC 10. Failure made her leave without answering.
An ordinary information-seeking question became a failed persuasion attempt.

Ordinary questions should usually reveal information. Reserve rolls for persuasion,
deception, resistance or meaningful risk. On failure, introduce a complication while
leaving a useful clue, lead or alternative approach. Do not promise automatic success;
make both success and failure produce something the player can act on.

Add focused adjudication and narration evaluations covering ordinary questions,
persuasion, investigation, creative solutions and failed checks. Treat prompt changes
as gameplay changes and inspect narrative quality alongside deterministic rule tests.

**Acceptance:** Asking a basic opening question does not require persuasion without a
fictional reason. Failed checks preserve the authoritative outcome and leave a clear
next opportunity. Check multiple model responses rather than judging one sample.

Sources: [adjudication](../server/adjudication.cjs), [world prompts](../server/world.cjs).

## 3. Connect tactical combat to the story

**Confirmed in source:** The player manually starts tactical encounters and names the
foe. The starter enemy has fixed 12 HP and 12 AC. Tactical actions use a separate API
and the browser reloads after receiving updated state.

Let narrative encounters create appropriate combatants automatically. Use enemy
archetypes and explicit encounter state; carry victory, surrender, escape, injuries,
rewards and NPC consequences back into narration and the quest log. Both free-text
and grid actions should operate on the same authoritative encounter and resources.
Replace reload-driven updates with coordinated state rendering as part of integration.

**Acceptance:** A fight arising from the story can be completed without manually
inventing the opponent. Damage, resources and outcomes agree between the character
sheet, tactical view and next narration. Retries or competing UI actions cannot apply
the same consequence twice. Include surrender and escape paths, not only killing.

Sources: [tactical rules](../server/tactical.cjs), [tactical API](../api/tactical.js),
[turn API](../api/turn.js), [battle UI](../dist/aidm-port.js).

## 4. Give XP a purpose

**Confirmed in source:** Characters start and remain mechanically level 2; XP tracks
narrative progress without automatic levelling.

Build a small, complete progression arc, initially perhaps levels 2–5. Add meaningful
class choices, appropriate HP and resource growth, spells and equipment upgrades.
Show the next threshold and what it unlocks. Keep progression server-authoritative,
and support existing saves when extending their schema.

**Acceptance:** A completed adventure awards progress toward a visible unlock; crossing
a threshold grants the selected benefits exactly once and survives save/restore.
Different classes receive distinct, usable improvements.

Source: [world state and progression](../server/world.cjs).

## 5. Preserve the player's story

**Confirmed in source:** Saved history retains six turns. AI context uses only recent
history and bounded summaries, facts and lists; there is no complete chronicle in that
state. This is a retention limitation, not proof of a measured long-campaign failure.

Store a complete readable chronicle separately from bounded AI context and include it
in backup/export. Give NPCs, quests and promises structured records with stable
identities, status and relevant relationships. Retrieve relevant established facts for
future turns; start with structured lookup and evaluate whether embeddings are needed.

**Acceptance:** Earlier scenes remain readable after more than six turns. A named NPC,
unresolved promise and completed quest remain available after a longer campaign and
backup/restore. Keep active, completed and failed quests distinguishable.

Sources: [world history and context](../server/world.cjs), [backup format](../dist/extras.js).

## 6. Make turns smoother to read

**Confirmed in source:** The turn API returns the completed result rather than streamed
narration. The client replaces the entire story log on render and scrolls it to the
bottom. In an ARIA live log this risks repeated announcements; screen-reader behaviour
was not directly tested in this review.

Stream narration for display while committing authoritative state only after the full
response passes validation. Show actual turn stages where available. Append new
transcript entries instead of rebuilding the log, and preserve scroll position when
someone is reading earlier text. Offer a new-content indicator when not at the bottom.

**Acceptance:** New text appears progressively; interrupted or invalid turns preserve
the previous save and support retry. Partial narration is clearly provisional if a
turn fails. Screen readers announce new content without repeating earlier entries,
and reading older text is not interrupted by forced scrolling.

Sources: [turn API](../api/turn.js), [story rendering](../dist/world.js).

## Atmosphere and presentation

After the core play loop improvements, add a restrained illustrated opening, location
artwork, and clear feedback for damage, discoveries and quest completion. Retain the
existing typography and palette. Keep artwork responsive and lightweight, make motion
respect reduced-motion preferences, and communicate outcomes in text as well as visuals.

## Next release: one excellent 20-minute adventure

Build and playtest a complete opening arc in which the player can:

1. Meet the woman and obtain a clue through several plausible approaches.
2. Travel somewhere memorable and see the location reflected in the map and story.
3. Resolve a real encounter through combat, negotiation or escape.
4. Earn a meaningful reward and see progress toward a character unlock.
5. Return to discover that their choices changed an NPC, quest or location.
6. Save, restore and resume with those consequences intact.

Target roughly 20 minutes without forcing a fixed route or preventing open-world play.
Use this arc to verify that the existing features work together before adding breadth.

## Order of work

1. Mobile story-first layout, conversation adjudication and combat integration.
2. Character progression, durable chronicle and structured campaign memory.
3. Smoother turn delivery and accessible incremental rendering; fix transcript
   accessibility early if confirmed during testing rather than waiting for streaming.
4. Atmospheric artwork and visual feedback, followed by broader content expansion.

Evaluate each change against the opening arc and maintain clear distinctions between
implemented features, code-confirmed limitations, playtest observations and proposals.
