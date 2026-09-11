# Astra DnD Game - Improvement Analysis

Based on the repository's own backlog (`docs/IMPROVEMENTS.md`), the game has a fantastic foundation (server-authoritative mechanics, signed saves, and great AI handling) but there are several major areas where we could take it to the next level. 

Here are the highest-impact improvements we could make:

## 1. Core Game Mechanics
*   **Enemy Stat Blocks**: Currently, enemies don't have actual HP or Armor Class; combat is mostly narrative. Adding real enemy HP that the server tracks would turn combat into a mechanical challenge rather than just flavor text.
*   **Leveling Up**: The player is permanently stuck at Level 2, and XP doesn't buy anything. Implementing a basic leveling system (HP increases, proficiency bumps, new spell slots) would massively improve long-term motivation.
*   **Actual Death Mechanics**: Dropping to 0 HP just pauses the game until you succeed/fail death saves. We could add real narrative or mechanical stakes (losing items, gold, or gaining exhaustion) on a defeat.

## 2. The AI Dungeon Master
*   **Stream the Narration**: Right now, you have to wait for the entire AI response to generate before you see anything. Streaming the text as it generates would make the game feel instantly responsive.
*   **Long-term Memory (RAG)**: The AI currently relies on a shrinking summary of the story, meaning it will forget NPCs and events from earlier in the campaign. Giving it a proper retrieval system would fix its amnesia.

## 3. Saves and Persistence
*   **Save Export/Import**: Since the game relies entirely on your browser's `localStorage`, clearing your browser data deletes your campaign forever, and you can't play on a different device. Adding a simple "Export Save" and "Import Save" button would solve this immediately.
*   **Undo / Rewind**: If the AI makes a mistake or hallucinates, you are stuck with it. A button to rewind the last turn would be a huge quality-of-life win.

## 4. UI / UX 
*   **Visual Map**: Instead of just listing available exits, we could render a visual node-graph map of the places you've discovered.
*   **Accessibility Bug Fix**: The game currently rebuilds the entire chat log on every turn, which forces screen readers to re-read the *entire* story from the beginning every time you take an action. This is a critical bug that needs fixing.
