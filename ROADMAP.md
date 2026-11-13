# RIFTROLL: Arcane Arena — Development Roadmap

## Completed in MVP
- **Deterministic Pure TypeScript Combat Engine** (`src/engine/combatEngine.ts`) completely decoupled from React, rendering, and network transport.
- **All 8 Schools of Magic** (Fire, Water, Earth, Lightning, Wind, Ice, Dark Magic, Light Magic) with offensive, defensive, and Ultimate spells plus `+2` elemental counter modifiers.
- **Digital & Physical D20 Modes** using unbiased Web Crypto rejection sampling (`rollCryptographicD20`) and a fast 1–20 physical tabletop input pad.
- **Persistent Arcane Meter** carrying over across battles within Best-of-3 and Best-of-5 matches while resetting cleanly on new matches.
- **Arcane Clash (18–19 vs 18–19)**, **Last Stand (Natural 20 comeback at 1 HP)**, and **Sudden Death (1 HP tiebreaker with infinite-loop protection)**.
- **Solo vs AI** (*Apprentice*, *Sorcerer*, *Archmage*) and **Local Face-to-Face Multiplayer** (including both Side-by-Side and 180° Rotated Tabletop layouts).
- **15-Test Automated Verification Suite** (`src/engine/combatEngine.test.ts`).

---

## Future Milestones (Codex & GitHub Continuation)

### Milestone 1 — Server-Authoritative Firebase Online Multiplayer
- Provision Firebase Authentication and Firestore alongside Cloud Functions (or an Express + WebSocket Cloud Run backend).
- Implement `FirebaseMultiplayerAdapter` conforming to `src/multiplayer/transport.ts`.
- Move `rollCryptographicD20()` and `resolveCombatExchange()` execution into a server-authoritative endpoint so clients only submit spell selection intents and roll requests.
- Enable 2–4 player private rooms (`RIFT-XXXX` codes) with King-of-the-Hill / Winner-Stays rotation for players 3 and 4.

### Milestone 2 — Expanded Grimoire & Named Spells
- Expand each of the 8 elemental schools from 1 offensive / 1 defensive / 1 ultimate spell to a customizable 3-spell loadout per school.
- Introduce optional post-MVP elemental status effects (e.g., *Burn*, *Chilled*, *Shocked*) behind an "Advanced Ruleset" match toggle.

### Milestone 3 — Custom Mage Avatars & 3D WebGL Shaders
- Add selectable mage archetypes, staffs, and cosmetic astral auras.
- Expand the HTML5 Canvas particle arena with custom GLSL post-processing shaders for Ultimate finishers.

## Known Limitations in MVP
- **Online Multiplayer**: Intentionally disabled in the local sandbox per specification so online play is never faked; local 2-player (tabletop and side-by-side) and Solo AI modes operate offline with zero external dependencies.
