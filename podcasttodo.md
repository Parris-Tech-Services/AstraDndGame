# Podcast Integration TODO

**Decision:** Add — excellent fit.  
**Status:** ✅ Independent one-click podcast bank added 16 September 2026.  
**Topic bank:** D&D, dungeon mastering, Forgotten Realms, encounter design, RPG rules, improv, worldbuilding, tabletop storytelling.

## Completed
- [x] Curate 25 Spotify episodes across D&D/RPG topics.
- [x] Add a collapsed bottom **🎧 Podcasts** launcher.
- [x] One tap opens the player; **🎲 Different podcast** selects another episode and avoids immediate repeats.
- [x] Persist the selected episode locally.
- [x] Use Spotify embed/deep links without assuming autoplay.
- [x] Tag episodes by DM advice, encounters, actual play, lore, worldbuilding and RPG design.
- [x] Automatically close/unload the podcast player whenever Astra read-aloud or page audio starts so game narration remains primary.
- [x] Keep gameplay controls and tactical state primary on mobile.
- [x] Cache the local podcast-player asset with the Astra app shell.

## Implementation
`dist/podcast-player.js` contains Astra's local 25-episode D&D/RPG bank and player UI. `dist/state-validation.js` loads it in the live app without relying on JoshHub, jsDelivr or a remote podcast catalogue. The player uses Spotify embeds only after the user opens it and yields to Astra's own narration/audio.
