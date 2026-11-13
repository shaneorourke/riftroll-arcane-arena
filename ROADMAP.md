# RIFTROLL: Arcane Arena — Development Roadmap

## Next release — Kids-first battles

Choose a spell → roll → watch the hit → see what changed.

### 1. Give the attack the arena
- Remove the centre-screen combat card that covers the projectile and shield. Keep detailed roll comparisons and explanations in the combat log, available on demand.
- Show the cast, defence and impact in sequence. Put damage numbers beside the affected mage and let the health bar confirm the change.
- Use a shield for a block, a reflected spark for a parry and a fizzled cast for a miss. Pair each effect with a distinct shape and a short accessible outcome announcement.
- Done when the projectile and impact stay visible on phone and desktop layouts, and the affected mage and outcome are clear in reduced-motion mode.

### 2. Simplify each turn
- Give the player one short instruction at a time, such as **Pick a spell** or **Roll**. Use large element icons with short names, and move spell descriptions into the grimoire.
- Make whose turn it is obvious with a highlight around their mage and controls. Use consistent dice, shield, heart and Arcane Meter icons.
- Keep the physical D20 number pad and check that both players can use it in tabletop mode.
- Done when a first-time player can choose, roll and take the next turn without reading the help screen.

### 3. Make big moments feel big
- Give critical hits, Ultimates, Arcane Clash and Last Stand distinct silhouettes and short animations. Put the action first, with prompts such as **Roll again** and **Roll 20 to survive** where a player needs to act.
- Keep special-event controls readable for the active player in 180° tabletop mode. Verify the same cues with sound muted and reduced motion on.
- Playtest with first-time players in the target age group. Watch whether they know whose turn it is, what to tap and who took damage. Revise the cues that cause hesitation.

## Completed in MVP
- **Deterministic Pure TypeScript Combat Engine** (`src/engine/combatEngine.ts`) completely decoupled from React, rendering, and network transport.
- **All 8 Schools of Magic** (Fire, Water, Earth, Lightning, Wind, Ice, Dark Magic, Light Magic) with offensive, defensive, and Ultimate spells plus `+2` elemental counter modifiers.
- **Digital & Physical D20 Modes** using unbiased Web Crypto rejection sampling (`rollCryptographicD20`) and a fast 1–20 physical tabletop input pad.
- **Persistent Arcane Meter** carrying over across battles within Best-of-3 and Best-of-5 matches while resetting cleanly on new matches.
- **Arcane Clash (18–19 vs 18–19)**, **Last Stand (Natural 20 comeback at 1 HP)**, and **Sudden Death (1 HP tiebreaker with infinite-loop protection)**.
- **Solo vs AI** (*Apprentice*, *Sorcerer*, *Archmage*) and **Local Face-to-Face Multiplayer** (including both Side-by-Side and 180° Rotated Tabletop layouts).
- **15-Test Automated Verification Suite** (`src/engine/combatEngine.test.ts`).

---

## Later milestones

### Private online guest duels
- The local prototype supports two guests, invite links and room codes, server-controlled dice, and returning to the same seat after a refresh.
- Deploy the game and room server together over HTTPS, then test a full best-of-three on separate devices, including a reconnect.
- Bring the local exchange animations to online duels and add room persistence across server restarts before a wider release.

### Expanded grimoire and named spells
- Expand each of the 8 elemental schools from 1 offensive / 1 defensive / 1 ultimate spell to a customizable 3-spell loadout per school.
- Introduce optional post-MVP elemental status effects (e.g., *Burn*, *Chilled*, *Shocked*) behind an "Advanced Ruleset" match toggle.

### Mage cosmetics and advanced visual effects
- Add selectable mage archetypes, staffs, and cosmetic astral auras.
- Expand the HTML5 Canvas particle arena with custom GLSL post-processing shaders for Ultimate finishers.

## Known Limitations in MVP
- **Online Multiplayer** works with the local room server. Internet play needs a deployed server. Solo and local modes can be played offline.
