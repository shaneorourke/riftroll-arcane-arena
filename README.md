# RIFTROLL: Arcane Arena

**RIFTROLL: Arcane Arena** is a fast-paced magical arena battler in which powerful mages duel using all eight schools of elemental magic and D20 dice. Every mage can wield all eight schools of magic on any turn, combining fighting-game mind games with dramatic tabletop D20 rolls.


## Private guest duels

Run `npm run dev`, then open **Online Rooms → Host a duel**. Share the invite link or room code and open it in a second browser profile or on another device that can reach the same server. A tab can reclaim its seat after a refresh. The server owns dice and turn validation.

For a built copy, run `npm run build` and `npm start`. The server listens on localhost port 3002 by default. Set `PORT` and `RIFTROLL_HOST` to match your host. For phone testing on the same network, run Vite with a reachable LAN address and open that address on both devices.

Rooms live in memory on one server process and expire an hour after creation. Restarting the server clears them. Internet play requires deploying this server and serving the game over HTTPS.

---

## 1. Quick Start & Commands

```bash
# Install dependencies
npm install

# Start the development server on port 3000
npm run dev

# Type-check the project
npm run lint

# Build for production
npm run build
```

You can also run the built-in **15-Test Deterministic Combat Engine Suite** directly in the browser under **How to Play & Tests → Engine Tests**, or execute it via `tsx`.

---

## 2. Core Game Rules

### Eight Schools of Magic
Every mage has unrestricted access to all 8 elemental schools on every turn:
1. **Fire** (*Cinder Nova* / *Molten Aegis* / Ultimate: *Inferno Cataclysm*) — Defends strongly (+2) against **Ice**.
2. **Water** (*Riptide Lance* / *Maelstrom Ward* / Ultimate: *Tidal Dragon*) — Defends strongly (+2) against **Fire**.
3. **Earth** (*Tectonic Spike* / *Obsidian Bulwark* / Ultimate: *Titan's Wrath*) — Defends strongly (+2) against **Lightning**.
4. **Lightning** (*Volt Spear* / *Faraday Cage* / Ultimate: *Thunder God's Wrath*) — Defends strongly (+2) against **Water**.
5. **Wind** (*Gale Scythe* / *Zephyr Vortex* / Ultimate: *Tempest Ascension*) — Defends strongly (+2) against **Earth**.
6. **Ice** (*Glacial Hail* / *Permafrost Mirror* / Ultimate: *Absolute Zero*) — Defends strongly (+2) against **Wind**.
7. **Dark Magic** (*Void Tendril* / *Event Horizon* / Ultimate: *Abyssal Oblivion*) — Defends strongly (+2) against **Light Magic**.
8. **Light Magic** (*Solar Ray* / *Seraphic Halo* / Ultimate: *Divine Judgement*) — Defends strongly (+2) against **Dark Magic**.

### Turn Sequence
1. Determine the attacking player (randomly selected for Battle 1; alternates every subsequent battle).
2. Attacker selects an elemental school (and optionally arms their **Ultimate** if at 100 Arcane Energy).
3. Defender sees the attacking element and selects a defensive elemental school.
4. Attacker rolls a D20 (Digital cryptographic roll or Physical tabletop D20 input).
5. Defender rolls a D20.
6. Combat engine resolves the interaction, updates Health and Arcane Meters, plays elemental animations, and switches roles.

### Attack Damage Table (Natural D20)
- **Natural 1**: Critical failure — **0 damage** (always fails, even with modifiers or Ultimate).
- **2–5**: Weak attack — **6 damage**.
- **6–10**: Normal attack — **12 damage**.
- **11–15**: Strong attack — **18 damage**.
- **16–19**: Devastating attack — **25 damage**.
- **Natural 20**: Critical strike — **35 damage**.

### Defence Resolution (Effective Defence vs. Effective Attack)
- **Defence 5 or more below Attack**: Full damage.
- **Defence within 4 points of Attack**: Half damage (rounded up).
- **Defence 5 or more above Attack**: Perfect block (**0 damage**).
- **Natural Defence 20**: **Parry!** Zero damage taken and **12 counterattack damage** dealt to the attacker. Takes priority over an Attack Critical Strike.

### Persistent Arcane Meter & Ultimates
- **Range**: `0` to `100`.
- **Gains**: Performing an attack (`+8`), Partial or Perfect Block (`+10`), Perfect Parry (`+15` instead of block gain), Taking damage (`+5`).
- **Ultimate Attack**: At `100` Arcane Energy, the attacker can consume `100` energy to add **+15 base damage** to any non-fumble attack roll.
- **Persistence Rule**: Health resets at the start of each new battle in a match, **but Arcane Energy persists between battles within the same match**. It only resets when starting a new match.

### Special Mechanics
- **Arcane Clash**: If both natural D20 rolls are `18` or `19`, the spells collide in the center of the arena. Both players roll one additional D20: higher roll deals **15 damage**, or equal rolls deal **5 damage to both**.
- **Last Stand**: Once per battle per player, if an incoming attack would reduce a player to `0 HP`, they are offered a Last Stand D20 roll. A **Natural 20** leaves them at `1 HP` and deals **15 counterattack damage**.
- **Sudden Death**: If both players reach `0 HP` simultaneously, both return to `1 HP`, retain their Arcane Meters, and continue until one survivor remains.

---

## 3. Architecture Overview

- `src/engine/types.ts` — Pure TypeScript data contracts and explicit `BattlePhase` state machine types.
- `src/engine/elements.ts` — Definitions for all 8 schools of magic and `+2` elemental advantage logic.
- `src/engine/dice.ts` — Unbiased cryptographic D20 generator (`crypto.getRandomValues` with rejection sampling).
- `src/engine/combatEngine.ts` — Pure, deterministic combat resolution functions (`resolveCombatExchange`, `resolveArcaneClash`, `resolveLastStand`, `resolvePostDamageHealth`). Zero React or Firebase dependencies.
- `src/engine/matchController.ts` — Immutable match and battle progression state machine.
- `src/engine/aiController.ts` — Tactical AI decision engine for *Apprentice*, *Sorcerer*, and *Archmage* difficulties (never manipulates dice probabilities).
- `src/engine/combatEngine.test.ts` — Automated test suite verifying all 15 core combat and match progression rules.
- `src/multiplayer/transport.ts` — Abstract `MultiplayerTransport` interface for server-authoritative online rooms.
- `src/components/` — Modular Arena Stage (HTML5 Canvas particle & beam renderer + stylized SVG mages), Dice Roller (Digital & Physical modes), Spell Selector, Tabletop 180° Face-to-Face layout, and HUD components.
