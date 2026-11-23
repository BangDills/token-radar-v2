[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/BangDills/token-radar-v2/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/BangDills/token-radar-v2/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Radar (radar-2): pre-token protocols ranked by implied value

A make.fun `token-radar-01` entry. It reads the sealed DefiLlama snapshot
(758 protocols, 40 on the watchlist, floor $50M TVL), scores every pre-token
protocol with a fitted sector-comps model, and writes a ranked board, a static
dashboard, three screenshots and the judge's dossier.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json|directory>
```

Node 22, standard library only. Inside the grader's container the input is
`/input/snapshot.json` and the output is `/output`.

## Model (lib/model.ts, `radar-2`)

`implied = round(tvl_usd x sector_multiple x growthMult x wait(age) x chains)`

- **sector_multiple**: the median mcap/TVL of the snapshot's own live-token
  comps in the protocol's sector (128 live comps with positive mcap, CoinGecko
  id and symbol, snapshot 2026-11-14). No protocol name is special-cased; only
  the category string picks the sector.
- **growthMult**: `1 + clamp(change_7d, -40, 60)/100 x 0.5`.
- **wait(age)**: TGE-wait curve over `age_days` (as_of minus listed_at,
  unknown: 365d) — 0.70x at <=90d, rising to 1.00x at 240d, 1.25x at 540d
  (prime TGE window), easing to 0.95x past 900d.
- **chains**: `1 + min(0.15, max(0, chains-1) x 0.025)`.

**Fitted sector multiples (mcap/TVL medians):**

| Sector | comps | median |
|---|---:|---:|
| Basis/Deriv | 10 | 1.0568x |
| Bridge | 18 | 0.6776x |
| Dexs | 11 | 0.3424x |
| RWA | 9 | 0.2748x |
| Other | 25 | 0.2227x |
| Yield | 14 | 0.1914x |
| Lending | 18 | 0.1505x |
| CEX | 9 | 0.0748x |
| LST | 15 | 0.0324x |
| Global fallback | 128 | 0.2138x |

**Held-out validation of the comps curve** (shown on the dashboard):

- Leave-one-out over the 128 live comps: median miss **x4.44**.
- Walk-forward trained on listings up to 2024-02-09 (47 comps), tested on the
  newer 48: median miss **x4.99**.

**Token odds** are the snapshot's own peer record: share of protocols that
already trade per age cohort — young<180d: 3.4%, mid 180-540d: 10.5%,
mature 541-900d: 13.6%, old>900d: 23.3%.

**Board**: all 40 watchlist slugs + top 200 pre-token protocols below the
floor by TVL (240 rows). Live-token protocols are never ranked; the top 24 by
market cap appear only in the dashboard's Live token view.

## Dashboard (dashboard/)

Static page, no framework, no network (`index.html` + `app.css` + `app.js`
read `data.js` written beside them):

- KPI strip: watchlist 40/40, rows scored, comps fitted, LOO + walk-forward
  errors, live set aside.
- Sortable table (rank, protocol, TVL, 7d, age, token odds, implied value),
  filters (text search, category, chain, TGE-readiness band), quick-filter
  chips, hash routing (`#q=…&category=…&chain=…&band=…&p=<slug>`).
- Per-row detail drawer: valuation breakdown (TVL x sector multiple x growth
  x wait x chains = implied, with the numbers), the page's recomputation
  check against `board.json`, token odds, and the costed farm blueprint.
- Self-check strip: watchlist coverage, sort order, costed steps.
- Model panel stating the formula, every fitted constant and the test numbers.

## Farm plans

Six steps per row, derived from the protocol's own sector, chains, TVL and
age (never a hand-kept name list): fresh-wallet setup, the sector's qualifying
action with capital ($50-250 by TVL) and chain gas note, a second weekly
action on another surface of the same protocol, an age-based hold window
(30/45/60 days), points-page claim hygiene, and a farm log. Every step states
cost ($) and time.

## Gate

Verified with `python3 /root/makefun/verify_radar.py <repo>` (all checks pass)
plus the kit's `node cli/makefun.mjs check`. Two runs write byte-identical
output (deterministic). Dashboard source text totals ~37KB of the 64KB dossier
cap; screenshots are 1440x900 PNGs under 512KiB each.

## Layout

- `main.ts` — entrypoint: snapshot in, `board.json` + `data.js` +
  `dashboard/` + `screenshots/` + `dossier.json` out.
- `lib/model.ts` — the fitted model, board builder, farm plans.
- `vendor/makefun-board.ts` — make.fun's dossier library (unchanged).
- `dashboard/` — the static page. `screenshots/` — the three handed-in views.
