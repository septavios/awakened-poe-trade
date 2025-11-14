import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), '..')
const ITEMS_PATH = path.join(ROOT, 'renderer/public/data/en/items.ndjson')

function readNdjson (file) {
  const text = fs.readFileSync(file, 'utf8')
  return text.trim().split('\n').map(line => JSON.parse(line))
}

function isArmourCategory (cat) {
  return ['Helmet', 'Body Armour', 'Gloves', 'Boots', 'Shield'].includes(cat)
}

function computeValue (entry, type) {
  const a = entry.armour || {}
  switch (type) {
    case 'armour': return a.ar?.max ?? 0
    case 'evasion': return a.ev?.max ?? 0
    case 'energy_shield': return a.es?.max ?? 0
    case 'ward': return a.ward?.max ?? 0
    case 'hybrid_armour_evasion': return (a.ar?.max ?? 0) + (a.ev?.max ?? 0)
    case 'hybrid_armour_es': return (a.ar?.max ?? 0) + (a.es?.max ?? 0)
    case 'hybrid_evasion_es': return (a.ev?.max ?? 0) + (a.es?.max ?? 0)
    default: return 0
  }
}

const DEF_TYPES = [
  'armour', 'evasion', 'energy_shield', 'ward',
  'hybrid_armour_evasion', 'hybrid_armour_es', 'hybrid_evasion_es'
]

function rankBy (items, category, type) {
  const candidates = items.filter(e => e.baseType?.category === category)
    .filter(e => {
      const a = e.armour || {}
      switch (type) {
        case 'armour': return a.ar
        case 'evasion': return a.ev
        case 'energy_shield': return a.es
        case 'ward': return a.ward
        case 'hybrid_armour_evasion': return a.ar && a.ev
        case 'hybrid_armour_es': return a.ar && a.es
        case 'hybrid_evasion_es': return a.ev && a.es
        default: return false
      }
    })
  const ranked = candidates.map(e => ({
    refName: e.refName,
    val: computeValue(e, type)
  }))
    .filter(x => x.val > 0)
    .sort((a, b) => {
      if (b.val !== a.val) return b.val - a.val
      return a.refName.localeCompare(b.refName)
    })
  return ranked.map(x => x.refName)
}

function main () {
  const items = readNdjson(ITEMS_PATH)
  const byCat = ['Helmet', 'Body Armour', 'Gloves', 'Boots', 'Shield']
  const out = {}
  for (const cat of byCat) {
    const rec = {}
    for (const t of DEF_TYPES) {
      rec[t] = rankBy(items, cat, t)
    }
    out[cat] = rec
  }
  process.stdout.write(JSON.stringify(out, null, 2) + '\n')
}

main()

