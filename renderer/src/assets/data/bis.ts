export type DefenseType =
  | 'armour'
  | 'evasion'
  | 'energy_shield'
  | 'ward'
  | 'hybrid_armour_evasion'
  | 'hybrid_armour_es'
  | 'hybrid_evasion_es'
  | 'block'
  | 'spell_suppression'
  | 'all_res'
  | 'projectile_damage'
  | 'melee_damage'
  | 'stun_threshold'

export const BIS_BASES = new Set<string>([
  'Giantslayer Helmet',
  'Royal Plate',
  'Leviathan Gauntlets',
  'Leviathan Greaves',
  'Colossal Tower Shield',
  'Astral Plate',
  'Spiked Gloves',
  'Brimstone Treads',
  'Ezomyte Tower Shield',
  'Thwarting Gauntlets',
  'Majestic Pelt',
  'Syndicate\'s Garb',
  'Velour Gloves',
  'Velour Boots',
  'Lacquered Buckler',
  'Assassin\'s Garb',
  'Gripped Gloves',
  'Stormrider Boots',
  'Vaal Buckler',
  'Crusader Buckler',
  'Trapsetter Gloves',
  'Lich\'s Circlet',
  'Twilight Regalia',
  'Warlock Gloves',
  'Warlock Boots',
  'Titanium Spirit Shield',
  'Occultist\'s Vestment',
  'Nexus Gloves',
  'Dreamquest Slippers',
  'Fossilised Spirit Shield',
  'Fingerless Silk Gloves',
  'Harmonic Spirit Shield',
  'Haunted Bascinet',
  'Conquest Lamellar',
  'Wyvernscale Gauntlets',
  'Wyvernscale Boots',
  'Cardinal Round Shield',
  'Penitent Mask',
  'Divine Crown',
  'Sacred Chainmail',
  'Paladin Gloves',
  'Paladin Boots',
  'Archon Kite Shield',
  'Champion Kite Shield',
  'Bone Helmet',
  'Apothecary\'s Gloves',
  'Two-Toned Boots',
  'Torturer\'s Mask',
  'Necrotic Armour',
  'Phantom Mitts',
  'Phantom Boots',
  'Supreme Spiked Shield',
  'Blizzard Crown',
  'Carnal Armour',
  'Fugitive Boots',
  'Runic Crown',
  'Runic Gauntlets',
  'Runic Sabatons',
  'Heat-attuned Tower Shield'
])

export const BIS_RANKINGS: Record<string, Partial<Record<DefenseType, string[]>>> = {
  Helmet: {
    armour: ['Giantslayer Helmet'],
    evasion: ['Majestic Pelt'],
    energy_shield: ['Lich\'s Circlet'],
    hybrid_armour_evasion: ['Haunted Bascinet'],
    hybrid_armour_es: ['Divine Crown'],
    hybrid_evasion_es: ['Torturer\'s Mask'],
    ward: ['Runic Crown']
  },
  'Body Armour': {
    armour: ['Royal Plate', 'Astral Plate'],
    evasion: ['Syndicate\'s Garb', 'Assassin\'s Garb'],
    energy_shield: ['Twilight Regalia', 'Occultist\'s Vestment'],
    hybrid_armour_evasion: ['Conquest Lamellar'],
    hybrid_armour_es: ['Sacred Chainmail'],
    hybrid_evasion_es: ['Necrotic Armour']
  },
  Gloves: {
    armour: ['Leviathan Gauntlets', 'Thwarting Gauntlets', 'Spiked Gloves'],
    evasion: ['Velour Gloves', 'Gripped Gloves'],
    energy_shield: ['Warlock Gloves', 'Nexus Gloves', 'Fingerless Silk Gloves'],
    hybrid_armour_evasion: ['Wyvernscale Gauntlets'],
    hybrid_armour_es: ['Paladin Gloves'],
    hybrid_evasion_es: ['Phantom Mitts'],
    melee_damage: ['Spiked Gloves'],
    projectile_damage: ['Gripped Gloves']
  },
  Boots: {
    armour: ['Leviathan Greaves', 'Brimstone Treads'],
    evasion: ['Velour Boots', 'Stormrider Boots'],
    energy_shield: ['Warlock Boots', 'Dreamquest Slippers'],
    hybrid_armour_evasion: ['Wyvernscale Boots'],
    hybrid_armour_es: ['Paladin Boots'],
    hybrid_evasion_es: ['Phantom Boots'],
    stun_threshold: ['Brimstone Treads']
  },
  Shield: {
    armour: ['Colossal Tower Shield', 'Ezomyte Tower Shield'],
    evasion: ['Lacquered Buckler'],
    energy_shield: ['Titanium Spirit Shield', 'Fossilised Spirit Shield', 'Harmonic Spirit Shield'],
    hybrid_armour_evasion: ['Cardinal Round Shield'],
    block: ['Vaal Buckler', 'Crusader Buckler', 'Archon Kite Shield'],
    spell_suppression: ['Supreme Spiked Shield']
  }
}

export function isBisBase (ns: string, category: string | undefined, refName: string): boolean {
  if (!category) return false
  if (!(category in BIS_RANKINGS)) return false
  return BIS_BASES.has(refName)
}

export function getBisRank (category: string | undefined, refName: string): number | null {
  if (!category) return null
  const byCat = BIS_RANKINGS[category]
  if (!byCat) return null
  for (const key of Object.keys(byCat) as DefenseType[]) {
    const arr = byCat[key]
    if (!arr) continue
    const idx = arr.indexOf(refName)
    if (idx !== -1) return (idx + 1)
  }
  return null
}
