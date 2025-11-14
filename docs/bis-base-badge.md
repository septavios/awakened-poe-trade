---
title: Best-in-slot base badge
---

## Overview
- Objective: Indicate when an item’s base type is best-in-slot (BiS) for its defensive class and slot, based on the PoE Wiki BiS page.
- Scope: Normal/Magic/Rare armour pieces and shields; offline detection via a curated list of base `refName`s.
- Outcome: A small, non-intrusive badge in Item Check and Price Check that helps quickly identify premium crafting bases.

## Data Source
- Source: PoE Wiki — Guide: Best in slot base types.
- Includes regular and non-regular basetypes (e.g., Ritual `Penitent Mask`, Heist `Heat-attuned Tower Shield`, Expedition `Runic Sabatons`) that can outperform regular bases even without implicits.

## Detection Rules
- Only consider: `ItemRarity.Normal | Magic | Rare` and `ItemCategory in ARMOUR` (`Helmet`, `BodyArmour`, `Gloves`, `Boots`, `Shield`).
- Match key: `item.info.refName` must exist in the curated BiS base set.
- Ignore implicits/influences; BiS evaluation is about the base itself.

## Data Model
- Static `Set<string>` of canonical base `refName`s (English), versioned and maintained in source control.
- Optional tag per entry (future): `armour|evasion|energy_shield|hybrid_armour_evasion|hybrid_armour_es|hybrid_evasion_es|ward`.

### Ranking Expansion (Top N)
- Maintain ordered lists per slot and defensive class, not limited to top 3:
  - For each armour slot (`Helmet`, `Body Armour`, `Gloves`, `Boots`, `Shield`) and each defence type group (`armour`, `evasion`, `energy_shield`, hybrids, `ward`), store a full ranking array of base `refName`s in descending strength.
- Structure:
  - `BIS_RANKINGS: Record<ItemCategory, Partial<Record<DefenseType, string[]>>>` with arrays `[#1, #2, #3, #4, ...]`.
  - Keep `BIS_BASES` as a flattened `Set<string>` for membership checks; use `BIS_RANKINGS` for rank calculation.
- Helpers:
  - `isBisBase(item): boolean` — membership via `BIS_BASES`.
  - `getBisRank(item): number | null` — returns `X ≥ 1` based on position in `BIS_RANKINGS` (handles missing groups safely).
  - If a base appears in multiple groups, prefer the smallest rank and optionally expose the matched group for tooltip.

### Computation Strategy
- Pure defence groups:
  - Compute normalized Q20 defence for bases and rank descending per slot/type using dataset values; ties break deterministically by base name.
- Hybrids and special implicits:
  - Curate lists for hybrids and specials (`block`, `spell_suppression`, `all_res`, `projectile_damage`, `melee_damage`, `stun_threshold`).
- Stability:
  - Exclude uniques/influenced variants; use canonical `refName` and `ItemCategory`.

## Integration
- Parsing provides canonical base type and category:
  - Parser entrypoint: `renderer/src/parser/Parser.ts:79` (`parseClipboard`).
  - Base resolution: `renderer/src/parser/Parser.ts:180` (`findInDatabase`) sets `item.info` and `item.category`.
  - Categories set: `renderer/src/parser/meta.ts:1` includes `Helmet`, `BodyArmour`, `Gloves`, `Boots`, `Shield` and `ARMOUR` set at `renderer/src/parser/meta.ts:46`.
- Implement helper: `isBisBase(item: ParsedItem)` that returns `true` when rules are satisfied.

## UI Changes
- Item Check overlay (`renderer/src/web/item-check/ItemInfo.vue:4`):
  - Add a pill-style badge near the item name: “Best-in-slot base”.
  - Badge visible only when `isBisBase(item)`.
- Price Check header label (`renderer/src/web/price-check/filters/FilterName.vue:35`):
  - Append ` (BiS)` to the active label or render a small pill next to it when `isBisBase(item)`.
- With ranking: append ` (BiS #X)` or show a pill `BiS #X` where `X ≥ 1`.
- Defence type: when enabled in settings, show `BiS #X (DefenceType)` using `getBisRankWithType(item)`.
- Tooltip: optionally include the matched defence type group.

## Internationalization
- Add keys:
- `item.best_in_slot_base` → "Best-in-slot base".
- `item.bis_rank_pill` → "BiS #{0}".
- `item.bis_rank_pill_with_type` → "BiS #{0} ({1})".
- `item.defence_type_*` labels for armour/evasion/energy shield/ward/hybrids/specials.
- Settings labels: `item.show_bis_badge`, `item.show_bis_type`.
- Matching relies on `refName` (English); no locale coupling required.

### Strings for Ranking
- `item.bis_rank_pill` → "BiS #{0}".
- `item.bis_rank_pill_with_type` → "BiS #{0} ({1})".
- Optional tooltip: `item.best_in_slot_rank_tooltip` → "Top defence base in its slot ({0})" with `{0}` as defence type.

## Settings
- Item Check and Price Check widgets include toggles:
- `Show BiS badge` — enable/disable the badge.
- `Show defence type on BiS` — enable/disable `(DefenceType)` next to rank.
- Defaults: enabled.
- Persisted in widget config and read by Item Check and Price Check components.

## Ranking Generator
- Dev-only script that computes full rankings (Top N) for pure defence groups from `items.ndjson`.
- Input: base item data (`armour`, `evasion`, `energy_shield`, `ward`).
- Output: ordered arrays per `ItemCategory` and `DefenseType` to merge into `BIS_RANKINGS`.
- Usage:
- `cd renderer && npm run generate-bis > /tmp/bis-generated.json`
- Review and copy arrays to `renderer/src/assets/data/bis.ts`.
- Curated groups (hybrids, specials) remain manual.

## Tests
- Matching tests:
  - Positive: samples for `Astral Plate`, `Majestic Pelt`, `Titanium Spirit Shield`, `Divine Crown`, `Supreme Spiked Shield`, etc.
  - Negative: non-BiS bases and non-armour categories.
- UI snapshot tests for `ItemInfo.vue` and `FilterName.vue` badge visibility.

### Tests for Ranking
- Positive: items known to be #1/#2/#3/#4+ across defence groups return the expected rank via `getBisRank`.
- Negative: non-BiS bases return `null`; ties and duplicates are handled deterministically.
- UI: snapshot variants for `BiS #1`, `BiS #2`, and `BiS #3` pills in both components.

## Acceptance Criteria
- Item Check shows the badge for BiS bases on Normal/Magic/Rare armour/shields.
- Price Check header reflects BiS status via badge or label adornment.
- No indicator for maps, currency, gems, unidentified uniques, or non-armour items.
- No network calls; works fully offline.

### Acceptance for Ranking
- Eligible armour/shield items show `BiS #X` with the correct rank for any `X ≥ 1`.
- If rank is not determinable but the base is BiS in another group, default to badge without rank or the best group’s rank.
- Badge hides for non-armour items and Uniques by default.

## Risks & Decisions
- Static list chosen for performance and stability; provide a dev-only update script later to refresh from the wiki.
- Unique items: Default behavior avoids showing the badge for Uniques (feature targets crafting bases).

### Ranking-Specific Considerations
- Defence groups from the wiki are heterogeneous (e.g., “+all res”, “+projectile damage” implicits on top of pure defence). Ranking remains curated, not computed algorithmically.
- Handle bases present only in special mechanics (Ritual/Heist/Expedition) the same way; rank per group includes them when applicable.

## Recommended Decisions
- Ranking strategy
  - Hybrid approach: compute pure defence groups from `BaseType.armour` (highest `armour`, `evasion`, `energy_shield`, `ward`, and hybrids), and curate special implicit-based groups from the wiki (e.g., `all_res`, `projectile_damage`, `melee_damage`, `stun_threshold`, shield `block`, `spell_suppression`).
  - Pure groups are reproducible from data; special groups are maintained manually for correctness.
- Data structure
  - Use `Partial<Record<DefenseType, string[]>>` per category to avoid empty arrays for unsupported groups.
- Validation & maintenance
  - Add a dev-only generator to compute pure defence rankings from `items.ndjson`/`BaseType.armour` and merge curated entries.
  - CI checks ensure `BIS_BASES`/`BIS_RANKINGS` entries resolve via `ITEM_BY_REF`, contain no duplicates, and ranking order is deterministic.
- DefenceType schema
  - Armour groups: `armour`, `evasion`, `energy_shield`, `ward`, `hybrid_armour_evasion`, `hybrid_armour_es`, `hybrid_evasion_es`.
  - Shield groups: compute `armour`, `evasion`, `energy_shield`; curate `block`, `spell_suppression`, and notable implicit-based groups.
- Badge scope
  - Show badges for `Normal | Magic | Rare` in armour categories only; exclude Uniques by default.
  - Influences/synthesised status do not affect BiS status (base-focused).
- UI behavior
  - Item Check: show `Best-in-slot base` or `BiS #X` pill near the item title when applicable.
  - Price Check: append `(BiS #X)` or show a pill; include optional tooltip with matched defence group.
  - Optional settings toggles to hide/show badges and rank indicator.
- Internationalization
  - Add English keys and rely on fallback for other locales: `item.best_in_slot_base`, `item.bis_rank_pill`, `item.best_in_slot_rank_tooltip`.
- Validation & maintenance
  - Dev-only generator computes pure defence rankings from `items.ndjson`/`BaseType.armour` and merges curated entries; validates that all `refName`s exist.
  - CI checks ensure `BIS_BASES`/`BIS_RANKINGS` entries resolve via `ITEM_BY_REF` and maintain schema.
  - Tests cover helpers (`isBisBase`, `getBisRank`) and UI snapshots for badge states.
- Performance
  - Use `Set<string>` and `Record<...>` for O(1) lookups; no runtime network calls; no parser changes.

## Delivery Plan
- Create curated set of BiS base `refName`s under `renderer/src/assets/data`.
- Implement `isBisBase(item)` helper and wire it in Item Check and Price Check.
- Add `item.best_in_slot_base` to `en/app_i18n.json` and optionally other locales.
- Add unit tests and snapshots; validate parsing/matching across rarities and corrupted/eldritch cases.

- Add settings toggles in Item Check and Price Check to control badge visibility and defence type.
- Provide ranking generator and integrate its output for pure defence Top N lists.

### Delivery for Ranking
- Add `BIS_RANKINGS` with ordered full-depth arrays per slot/group (Top N).
- Implement `getBisRank(item)` for any `X ≥ 1` and integrate rank into both badges.
- Add a dev-only ranking generator and CI validators to keep data up-to-date and consistent.
- Extend i18n and tests/snapshots to cover deeper rank display and fallbacks.

### Delivery for Settings
- Wire `showBisBadge` and `showBisType` in both widgets; update badge rendering to respect toggles.

## Code References
- `renderer/src/parser/Parser.ts:79` — `parseClipboard` pipeline.
- `renderer/src/parser/Parser.ts:180` — `findInDatabase` sets `item.info` and `item.category`.
- `renderer/src/parser/meta.ts:1` — `ItemCategory` enum; `renderer/src/parser/meta.ts:46` — `ARMOUR` set.
- `renderer/src/web/item-check/ItemInfo.vue:74` — badge and defence type rendering.
- `renderer/src/web/price-check/filters/FilterName.vue:79` — badge and defence type rendering.
- `renderer/src/web/item-check/settings-item-check.vue:20` — settings toggles for Item Check.
- `renderer/src/web/price-check/settings-price-check.vue:60` — settings toggles for Price Check.
- `renderer/src/assets/data/bis.ts:154` — `getBisRankWithType` helper.
- `renderer/scripts/generate-bis.mjs:1` — ranking generator.
