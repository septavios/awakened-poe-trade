# PoePrices Prediction Engine — Technical Specification

## 0. MVP Scope & Plan

- Objective: ship a functional MVP that returns usable rare-item price predictions compatible with Awakened PoE Trade.
- Must-have (MVP):
  - `GET /api` returning `min`, `max`, `currency`, `pred_confidence_score`, `pred_explanation`, `error`, `error_msg`, `warning_msg`.
  - English item text only; client-style cleanup; minimal parser for rares.
  - Comparables via public trade listings; robust median; simple interval.
  - Always emit `currency: "chaos"` for MVP; skip `divine`/`exalt`.
  - Basic caching (response + comparables) and per-IP rate limiting.
- Optional in MVP (can ship later):
  - `POST /send_feedback` storage; `w=1` HTML page.
  - Non-rare support; quantile/conformal intervals; SHAP explanations.
- Simplifications:
  - No sold-price inference; rely on listing snapshots and outlier trimming.
  - Double influence support is parsed but treated as a simple feature.
- Deliverables:
  - Public endpoint ready for the app, returning correct fields.
  - Sample item prediction validated (see Section 20).
  - Integration notes to point the app at your host.

## 1. Goals & Scope
- Provide a production-grade API that predicts Path of Exile item prices from raw item text.
- Return min/max price interval, currency, confidence score, and feature contributions.
- Accept and store user feedback to improve model quality over time.
- Maintain field-level compatibility with Awakened PoE Trade and similar clients.

## 2. High-Level Architecture
- Inference API: HTTP service exposing `GET /api` (prediction). `POST /send_feedback` optional in MVP.
- Item Parser: Converts cleaned item text into a structured representation and normalized features.
- Comparables Engine: Queries public trade listings to build a price context and anchor predictions.
- ML Predictor: Tabular regressor for rare items; rules/nearest-neighbor for non-rare items.
- Currency Normalizer: Converts prices to `chaos`/`divine`; supports `exalt` if needed.
- Caching & Rate Limiting: Response caching, comparables caching, IP/source throttling.
- Feedback Store: Persists judgments and textual feedback; used to label data for retraining.
- Data Collector & Trainer: Periodic job to refresh datasets and retrain/validate models per league.
- Observability: Logging, metrics, tracing, model/version audit.

## 3. API Specification
### 3.1 Prediction Endpoint
- `GET /api?i=<base64>&l=<league>&s=<source>[&w=1]`
- Query params:
  - `i`: base64 of cleaned item text (see Section 4)
  - `l`: trade league name (e.g., `Standard`, `Hardcore`, `Mercenaries`)
  - `s`: source identifier (`awakened-poe-trade` or other)
  - `w`: optional; when `1`, render a human-friendly HTML page for the same request
- Response JSON (fields required by Awakened PoE Trade):
  - `min`: number — lower bound price
  - `max`: number — upper bound price
  - `currency`: `"chaos"` (MVP). Future: `"divine" | "exalt"` as needed.
  - `pred_confidence_score`: number — confidence score (0–100 recommended)
  - `pred_explanation`: Array of `[string, number]` — feature contribution pairs
  - `error`: number — `0` for success; non-zero for known failure modes
  - `error_msg`: string — explanation for non-zero `error`
  - `warning_msg`: string — optional warnings
- Example JSON:
```json
{
  "min": 12.5,
  "max": 18.0,
  "currency": "chaos",
  "pred_confidence_score": 78,
  "pred_explanation": [["total_life", 0.21], ["movement_speed", 0.18], ["res_total", 0.15]],
  "error": 0,
  "error_msg": "",
  "warning_msg": "Few comparables (<20)"
}
```

### 3.2 Feedback Endpoint
- `POST /send_feedback`
- Form fields:
  - `selector`: `"low" | "fair" | "high"`
  - `feedbacktxt`: free text
  - `qitem_txt`: base64 of cleaned item text
  - `source`: string (e.g., `awakened-poe-trade`)
  - `min`, `max`: numbers (client-shown interval)
  - `currency`: string (`chaos`, `divine`, or `exalt`)
  - `league`: league name
- Behavior:
  - Persist feedback with request metadata and derived features.
  - Optionally accept `sale_price` when available for stronger labels.

### 3.3 Errors & Status Codes
- `200` with `error: 0`: success.
- `200` with `error != 0`: handled failure; `error_msg` explains.
- `4xx`: invalid input, unsupported league, rate-limit exceeded.
- `5xx`: transient server issues.

### 3.4 Rate Limiting
- Per-IP and per-`s` throttling, with leaky bucket or token bucket.
- Return `429` and `Retry-After` when exceeded.

## 4. Item Text Processing
- Input must be English item text.
- Cleaning rules (must match client behavior):
  - Remove advanced parenthetical descriptions attached to numbers (e.g., `+70 (augmented)` → `+70`).
  - Remove lines that are fully wrapped in `{}` (curly-braced hints).
- Encoding: UTF-8 → base64.
- Implementation note in client: `renderer/src/web/price-check/price-prediction/poeprices.ts:128-133`.

### MVP Parser Minimum
- Rarity: `Rare` only (return handled error for others in MVP).
- Base: name + basetype; category `BodyArmour`/`Weapon`/`Accessory`/etc.
- Item level bracket: e.g., `<=84`, `85`, `86+`.
- Sockets/links: detect `6L`/`5L`; socket color pattern optional.
- Influences: detect Exarch/Eater/Shaper/Elder/Hunter/Crusader/Redeemer by line tokens.
- Core stats: total life, total elemental res, chaos res (if present), armour and evasion totals.
- Flags: corrupted, quality, movement speed (boots), key implicits when present.

## 5. Parsing & Normalization
- Parse rarity, base type, item level, categories, influences (single influence preferred), sockets/links, corruption, quality, gem level, map tier, stat lines and rolls.
- Normalize numeric stats (sum life/resistances/ES, bracket item level) and categorical attributes (base families, influences, unique variants).
- Unique variant resolution and basetype rules mirror client logic for consistency: `renderer/src/web/price-check/trends/getDetailsId.ts:20-125`.

## 6. Comparable Retrieval
- Query public trade listings for matched items:
  - Filters based on parsed features (e.g., base, variant, sockets/links, keystone affixes).
  - Gather recent listings; exclude outdated/hard-priced outliers; prefer buyouts.
- Price aggregation:
  - Convert all to chaos; for MVP, reject non-chaos listings or normalize via fixed rate snapshot.
  - Use robust median of comparable listings; winsorize top/bottom 10% to reduce outliers.
- Caching:
  - Cache query results per `(feature_signature, league)` for 1–5 minutes TTL.

### MVP Matching Heuristics
- Required: same basetype, same rarity, same league.
- Prefer: same link count (`6L`), similar item level bracket.
- Score boosts: higher total life/res, double influence presence.
- Distance function: weighted sum on key features; accept top `N` (e.g., 30) results.

## 7. Feature Engineering & Modeling (Rares)
- Candidate features:
  - Base category/family, single influence, sockets/links (`6L`), item level brackets.
  - Suffix/prefix counts; tiers for key affixes; totals: life, ES, armour/evasion, resist (total/chaos), movement speed, crit chance/multi, accuracy, attributes.
  - Derived: damage and defense multipliers; notable mod presence flags.
- Model:
  - MVP: no ML training initially. Use comparables median as point estimate.
  - Derive `min/max` using interquartile range or percentile band (e.g., P25–P75 widened by factor).
- Confidence:
  - `pred_confidence_score` from comparables count and spread (narrower spread, more items → higher score).
- Explanations:
  - MVP: heuristic contributions. Example weights: `6L`, `total_life`, `res_total`, `double_influence` mapped to normalized importance.

## 8. Non-Rare Items
- Uniques, gems, maps, flasks:
  - Use nearest neighbor on exact variant + simple rules.
  - For uniques with multiple variants, resolve via specific stat combinations (`getUniqueVariant`).

## 9. Currency Handling
- MVP: emit `currency: "chaos"` only.
- Future: add `divine`/`exalt` support; clients can convert via ninja rates: `renderer/src/web/background/Prices.ts:54-63`.

## 10. League Handling
- Accept official trade league names (Standard/Hardcore/current temporary leagues).
- Include league phase as a feature or maintain per-league models; handle deflation/inflation across the season.

## 11. Security & Compliance
- HTTPS everywhere; strict input validation; JSON size limits.
- IP/source throttling; abuse detection; WAF/CDN recommended.
- Respect GGG ToS; do not automate in-game actions; only query public trade endpoints.
- Do not store PoE session identifiers; avoid collecting personally identifying information.

## 12. Scalability & Performance
- MVP Targets: p95 < 800 ms; p99 < 2 s.
- Stateless API with Redis cache; single region deployment acceptable.
- Optional `w=1` HTML can be added later.

## 13. Observability
- Log: request metadata (sans sensitive text), model version, latency, cache hits, error/result flags.
- Metrics: RPS, error rates, confidence distribution, drift indicators, feedback volumes.
- Tracing for slow comparables queries.

## 14. Feedback & Active Learning
- MVP: store feedback payloads; no retraining loop initially.
- Later: accept `sale_price` labels; implement scheduled retraining per league.

## 15. Versioning & Compatibility
- Keep response fields stable; only add optional fields.
- Include `X-Model-Version` header; expose `/version` endpoint.
- Respect client `s` value for analytics; return consistent `currency` enum.

## 16. Testing & Validation
- Unit test parsers on diverse items; golden files per archetype.
- Integration tests against trade API mocks; resilience under low/no comparables scenarios.
- Acceptance suites per league for regression; benchmarks for latency.

## 17. Client Integration (Awakened PoE Trade)
- Request construction in client: `renderer/src/web/price-check/price-prediction/poeprices.ts:31-41`.
- External link rendering: `renderer/src/web/price-check/price-prediction/poeprices.ts:80-88`.
- Currency normalization fallback: `renderer/src/web/price-check/price-prediction/poeprices.ts:54-77` → `renderer/src/web/background/Prices.ts:54-63`.
- Local proxy allowlist (for CORS-free access): add your host alongside existing entries in `main/src/proxy.ts:5-14`.

## 18. Examples
### 18.1 GET Prediction
```bash
curl "https://your-poeprices-host/api?i=<BASE64>&l=Mercenaries&s=awakened-poe-trade"
```
Response:
```json
{"min":10.0,"max":15.0,"currency":"chaos","pred_confidence_score":72,"pred_explanation":[["total_life",0.19],["res_total",0.14]],"error":0,"error_msg":"","warning_msg":""}
```

### 18.2 POST Feedback
```bash
curl -X POST "https://your-poeprices-host/send_feedback" \
  -F selector=low \
  -F feedbacktxt="Seems underpriced vs market comps" \
  -F qitem_txt="<BASE64>" \
  -F source="awakened-poe-trade" \
  -F min=10 -F max=15 -F currency=chaos \
  -F league=Mercenaries
```

## 19. Implementation Outline
- MVP Stack:
  - Node.js + Express for `GET /api`.
  - Minimal parser in Node (mirror client cleanup; extract core features).
  - Trade listings fetched via HTTP; cache in Redis; compute robust median and IQR.
  - Basic per-IP rate limit; log latency and errors.
  - Optional `POST /send_feedback` storing to PostgreSQL or a simple file-based store.
- Phase 2:
  - Move predictor to Python (FastAPI) or keep Node with trained GBT model.
  - Add SHAP explanations, quantile models, multi-currency output.

---

This spec retains API field parity with Awakened PoE Trade and documents the behavior clients expect, including cleanup and currency normalization realities. For integration, update the client URL target and proxy allowlist to your host as noted above.

## 20. Sample Item Walkthrough

### 20.1 Raw Item Text
```
Item Class: Body Armours
Rarity: Rare
Storm Wrap
Conquest Lamellar
--------
Quality: +20% (augmented)
Armour: 1795 (augmented)
Evasion Rating: 1825 (augmented)
--------
Requirements:
Level: 84
Str: 173
Dex: 173
Int: 51
--------
Sockets: G-R-R-G-R-G
--------
Item Level: 86
--------
11% of Physical Damage from Hits taken as Lightning Damage (implicit)
Flasks gain a Charge every 3 seconds (implicit)
--------
+282 to Armour
+300 to Evasion Rating
37% increased Armour and Evasion
+171 to maximum Life
+45% to Cold Resistance
+48% to Lightning Resistance
15% increased Stun and Block Recovery
8% additional Physical Damage Reduction
Searing Exarch Item
Eater of Worlds Item
```

### 20.2 Cleaned Text (client-compatible)
Cleaning removes parentheticals attached to numbers like `(augmented)` and drops lines fully wrapped in `{}` if present.
```
Item Class: Body Armours
Rarity: Rare
Storm Wrap
Conquest Lamellar
--------
Quality: +20%
Armour: 1795
Evasion Rating: 1825
--------
Requirements:
Level: 84
Str: 173
Dex: 173
Int: 51
--------
Sockets: G-R-R-G-R-G
--------
Item Level: 86
--------
11% of Physical Damage from Hits taken as Lightning Damage (implicit)
Flasks gain a Charge every 3 seconds (implicit)
--------
+282 to Armour
+300 to Evasion Rating
37% increased Armour and Evasion
+171 to maximum Life
+45% to Cold Resistance
+48% to Lightning Resistance
15% increased Stun and Block Recovery
8% additional Physical Damage Reduction
Searing Exarch Item
Eater of Worlds Item
```

### 20.3 Parsed Features (example)
- Category: `BodyArmour`; Base type: `Conquest Lamellar`; Rarity: `Rare`
- Quality: `20`; Item level: `86`; Requirements: `Str 173`, `Dex 173`, `Int 51`
- Sockets/links: `G-R-R-G-R-G` → single group of 6 sockets → `6L`
- Influences: `Searing Exarch` and `Eater of Worlds` (double influenced)
- Implicits: `11% Phys taken as Lightning`, `Flasks gain a Charge every 3s`
- Explicit totals: `+171 life`; `+45% cold`, `+48% lightning` → `res_total 93%`
- Defense totals: `1795 armour`, `1825 evasion`; `37% inc Armour and Evasion`
- Other: `+282 armour`, `+300 evasion`; `15% stun/block recovery`; `8% additional phys DR`

### 20.4 Example API Call
- Encode the cleaned text as UTF-8 base64 → `<BASE64_SAMPLE>`.
- Prediction request:
```
GET https://your-poeprices-host/api?i=<BASE64_SAMPLE>&l=Mercenaries&s=awakened-poe-trade&w=1
```
- Example response (illustrative):
```json
{
  "min": 12.0,
  "max": 18.0,
  "currency": "chaos",
  "pred_confidence_score": 75,
  "pred_explanation": [
    ["6L", 0.25],
    ["total_life", 0.20],
    ["double_influence_exarch_eater", 0.18],
    ["res_total", 0.15],
    ["armour_evasion_total", 0.12]
  ],
  "error": 0,
  "error_msg": "",
  "warning_msg": "Few exact comparables"
}
```
