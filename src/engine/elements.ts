import { ElementSchool } from './types';

export interface ElementSchoolConfig {
  id: ElementSchool;
  name: string;
  shortTitle: string;
  tagline: string;
  offensiveSpellName: string;
  defensiveSpellName: string;
  ultimateName: string;
  ultimateDescription: string;
  defendsStronglyAgainst: ElementSchool;
  vulnerableWhenAttacking: ElementSchool;
  primaryHex: string;
  secondaryHex: string;
  glowRgba: string;
  bgTintClass: string;
  borderClass: string;
  textClass: string;
  visualDescription: {
    offense: string;
    defense: string;
    ultimate: string;
  };
}

export const ELEMENT_SCHOOLS: Record<ElementSchool, ElementSchoolConfig> = {
  fire: {
    id: 'fire',
    name: 'Fire',
    shortTitle: 'Pyromancy',
    tagline: 'Explosive combustion & searing flame bursts',
    offensiveSpellName: 'Cinder Nova',
    defensiveSpellName: 'Molten Aegis',
    ultimateName: 'Inferno Cataclysm',
    ultimateDescription: 'Summons a volcanic solar pillar that engulfs the arena in searing plasma.',
    defendsStronglyAgainst: 'ice',
    vulnerableWhenAttacking: 'water',
    primaryHex: '#F97316',
    secondaryHex: '#EF4444',
    glowRgba: 'rgba(249, 115, 22, 0.55)',
    bgTintClass: 'bg-orange-950/50',
    borderClass: 'border-orange-500/60',
    textClass: 'text-orange-400',
    visualDescription: {
      offense: 'Blazing fireball spiral with ember shrapnel',
      defense: 'Swirling curtain of superheated flame',
      ultimate: 'Inferno Cataclysm meteoric firestorm',
    },
  },
  water: {
    id: 'water',
    name: 'Water',
    shortTitle: 'Hydromancy',
    tagline: 'Flowing shields & crushing abyssal tides',
    offensiveSpellName: 'Riptide Lance',
    defensiveSpellName: 'Maelstrom Ward',
    ultimateName: 'Tidal Dragon',
    ultimateDescription: 'Conjures a colossal serpent of pressurized ocean currents to crush all opposition.',
    defendsStronglyAgainst: 'fire',
    vulnerableWhenAttacking: 'lightning',
    primaryHex: '#0EA5E9',
    secondaryHex: '#14B8A6',
    glowRgba: 'rgba(14, 165, 233, 0.55)',
    bgTintClass: 'bg-sky-950/50',
    borderClass: 'border-sky-400/60',
    textClass: 'text-sky-400',
    visualDescription: {
      offense: 'High-pressure hydro vortex torrent',
      defense: 'Flowing turquoise sphere of cushioning tides',
      ultimate: 'Coiling Leviathan Tidal Dragon surge',
    },
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    shortTitle: 'Geomancy',
    tagline: 'Impenetrable monoliths & seismic eruptions',
    offensiveSpellName: 'Tectonic Spike',
    defensiveSpellName: 'Obsidian Bulwark',
    ultimateName: "Titan's Wrath",
    ultimateDescription: 'Shatters the arena bedrock and drops a crystalline mountain upon the enemy.',
    defendsStronglyAgainst: 'lightning',
    vulnerableWhenAttacking: 'wind',
    primaryHex: '#D97706',
    secondaryHex: '#10B981',
    glowRgba: 'rgba(217, 119, 6, 0.55)',
    bgTintClass: 'bg-amber-950/50',
    borderClass: 'border-amber-500/60',
    textClass: 'text-amber-400',
    visualDescription: {
      offense: 'Jagged basalt boulders & emerald crystal spikes',
      defense: 'Towering monolithic stone fortress wall',
      ultimate: "Titan's Wrath seismic tectonic crush",
    },
  },
  lightning: {
    id: 'lightning',
    name: 'Lightning',
    shortTitle: 'Electromancy',
    tagline: 'High-voltage arcs & blinding thunderstrikes',
    offensiveSpellName: 'Volt Spear',
    defensiveSpellName: 'Faraday Cage',
    ultimateName: "Thunder God's Wrath",
    ultimateDescription: 'Tears open the astral stormclouds for a relentless barrage of violet-gold judgment bolts.',
    defendsStronglyAgainst: 'water',
    vulnerableWhenAttacking: 'earth',
    primaryHex: '#EAB308',
    secondaryHex: '#A855F7',
    glowRgba: 'rgba(234, 179, 8, 0.6)',
    bgTintClass: 'bg-yellow-950/50',
    borderClass: 'border-yellow-400/60',
    textClass: 'text-yellow-300',
    visualDescription: {
      offense: 'Jagged violet and gold high-voltage arc',
      defense: 'Crackling magnetic plasma lattice',
      ultimate: "Thunder God's Wrath celestial storm pillar",
    },
  },
  wind: {
    id: 'wind',
    name: 'Wind',
    shortTitle: 'Aeromancy',
    tagline: 'Razor cyclones, evasion & swift deflection',
    offensiveSpellName: 'Gale Scythe',
    defensiveSpellName: 'Zephyr Vortex',
    ultimateName: 'Tempest Ascension',
    ultimateDescription: 'Forms a vacuum hyper-cyclone that rends space with supersonic wind blades.',
    defendsStronglyAgainst: 'earth',
    vulnerableWhenAttacking: 'ice',
    primaryHex: '#34D399',
    secondaryHex: '#99F6E4',
    glowRgba: 'rgba(52, 211, 153, 0.55)',
    bgTintClass: 'bg-emerald-950/50',
    borderClass: 'border-emerald-400/60',
    textClass: 'text-emerald-300',
    visualDescription: {
      offense: 'Crescent vacuum wind blades and swirling gusts',
      defense: 'Deflecting cyclone funnel barrier',
      ultimate: 'Tempest Ascension category-five vortex',
    },
  },
  ice: {
    id: 'ice',
    name: 'Ice',
    shortTitle: 'Cryomancy',
    tagline: 'Crystalline prism barriers & glacial spears',
    offensiveSpellName: 'Glacial Hail',
    defensiveSpellName: 'Permafrost Mirror',
    ultimateName: 'Absolute Zero',
    ultimateDescription: 'Halts molecular motion across the arena, encasing the foe in a shattering diamond glacier.',
    defendsStronglyAgainst: 'wind',
    vulnerableWhenAttacking: 'fire',
    primaryHex: '#22D3EE',
    secondaryHex: '#818CF8',
    glowRgba: 'rgba(34, 211, 238, 0.55)',
    bgTintClass: 'bg-cyan-950/50',
    borderClass: 'border-cyan-400/60',
    textClass: 'text-cyan-300',
    visualDescription: {
      offense: 'Piercing cyan icicle barrage and frost rings',
      defense: 'Hexagonal crystalline ice prism wall',
      ultimate: 'Absolute Zero flash-freeze supernova',
    },
  },
  dark: {
    id: 'dark',
    name: 'Dark Magic',
    shortTitle: 'Umbramancy',
    tagline: 'Abyssal curses, void rifts & shadow drain',
    offensiveSpellName: 'Void Tendril',
    defensiveSpellName: 'Event Horizon',
    ultimateName: 'Abyssal Oblivion',
    ultimateDescription: 'Opens a gravitational singularity that devours light and collapses reality on the target.',
    defendsStronglyAgainst: 'light',
    vulnerableWhenAttacking: 'light',
    primaryHex: '#A855F7',
    secondaryHex: '#EC4899',
    glowRgba: 'rgba(168, 85, 247, 0.6)',
    bgTintClass: 'bg-purple-950/50',
    borderClass: 'border-purple-400/60',
    textClass: 'text-purple-300',
    visualDescription: {
      offense: 'Black-hole tendrils laced with violet nebula energy',
      defense: 'Gravity-warping shadow vortex shield',
      ultimate: 'Abyssal Oblivion collapsing void singularity',
    },
  },
  light: {
    id: 'light',
    name: 'Light Magic',
    shortTitle: 'Lumimancy',
    tagline: 'Radiant purification & celestial sanctuary',
    offensiveSpellName: 'Solar Ray',
    defensiveSpellName: 'Seraphic Halo',
    ultimateName: 'Divine Judgement',
    ultimateDescription: 'Calls down a choir of golden astral lances from the zenith to purify the battlefield.',
    defendsStronglyAgainst: 'dark',
    vulnerableWhenAttacking: 'dark',
    primaryHex: '#FBBF24',
    secondaryHex: '#FEF08A',
    glowRgba: 'rgba(251, 191, 36, 0.6)',
    bgTintClass: 'bg-amber-950/40',
    borderClass: 'border-amber-300/70',
    textClass: 'text-amber-200',
    visualDescription: {
      offense: 'Blinding gold solar beam with sacred geometry rings',
      defense: 'Radiant golden sacred geometry dome',
      ultimate: 'Divine Judgement celestial pillar array',
    },
  },
};

export const ELEMENT_ORDER: ElementSchool[] = [
  'fire',
  'water',
  'earth',
  'lightning',
  'wind',
  'ice',
  'dark',
  'light',
];

/**
 * Checks whether the defending element has a +2 defensive mastery bonus
 * against the attacking element according to RIFTROLL core rules:
 * - Water defends effectively against Fire
 * - Earth defends effectively against Lightning
 * - Light defends effectively against Dark
 * - Dark defends effectively against Light
 * - Wind defends effectively against Earth
 * - Ice defends effectively against Wind
 * - Fire defends effectively against Ice
 * - Lightning defends effectively against Water
 */
export function hasDefensiveElementalAdvantage(
  attackElement: ElementSchool,
  defenceElement: ElementSchool
): boolean {
  const defenderConfig = ELEMENT_SCHOOLS[defenceElement];
  return defenderConfig.defendsStronglyAgainst === attackElement;
}

/**
 * Checks whether the attacking element has a +2 offensive breakthrough bonus
 * when the defender chooses the element weak to the attacker's school.
 * Note: Per section 5 ("An advantageous matchup gives +2 to the appropriate effective roll.
 * Suggested relationships: Water defends effectively against Fire..."),
 * if Defender picks Water against Fire, Defender gets +2 to their effective defence roll.
 * Conversely, if Attacker picks Water and Defender picks Fire (which is weak to Water),
 * Attacker gets +2 to their effective attack roll!
 * Exception: Light and Dark both defend effectively against each other; when Light attacks Dark,
 * Dark's defensive ward counters Light (+2 to Defender).
 */
export function evaluateElementalModifier(
  attackElement: ElementSchool,
  defenceElement: ElementSchool
): {
  attackModifier: number;
  defenceModifier: number;
  advantage: 'attacker' | 'defender' | 'none';
} {
  // Priority 1: Explicit defensive relationships from Section 5
  if (hasDefensiveElementalAdvantage(attackElement, defenceElement)) {
    return {
      attackModifier: 0,
      defenceModifier: 2,
      advantage: 'defender',
    };
  }

  // Priority 2: If Attacker's element counters Defender's element (and isn't mutually defensive like Light/Dark)
  if (hasDefensiveElementalAdvantage(defenceElement, attackElement)) {
    return {
      attackModifier: 2,
      defenceModifier: 0,
      advantage: 'attacker',
    };
  }

  return {
    attackModifier: 0,
    defenceModifier: 0,
    advantage: 'none',
  };
}
