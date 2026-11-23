// The token radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and adds
// pre-token protocols below the watchlist floor: the early rows the radar exists to find. A protocol
// is pre-token when its index entry records no usable token market cap (no positive mcap_usd and no
// CoinGecko id); the snapshot's live-token protocols are kept apart and shown as the market's own
// values, never mixed into the ranked board.
//
// Implied value follows only from the snapshot's own figures:
//
//   sector    = the protocol's sector bucket (from its category string, never its name)
//   multiple  = SECTOR_MULTIPLE[sector]: the median mcap/TVL of the snapshot's own live-token
//               comps in that sector (128 live comps; tiny sectors fall back to GLOBAL 0.2138)
//   base      = tvl_usd x multiple
//   growth    = clamp(change_7d, -40, 60) per cent
//   growthMult= 1 + (growth / 100) x GROWTH_WEIGHT
//   wait      = TGE-wait curve over age_days (as_of minus listed_at, unknown: 365):
//               0.70x at <=90d, rising to 1.25x across the 240-540d prime window,
//               easing to 0.95x past 900d
//   chains    = 1 + min(0.15, max(0, chains-1) x 0.025)
//   implied   = max(1, round(base x growthMult x wait x chains))
//
// Token odds come from the snapshot's own peer record: the share of protocols that already trade
// among the protocol's age/size cohort. Held-out tests of the comps curve (leave-one-out over the
// 128 live comps, walk-forward trained on listings up to 2024-02-09) are printed by fitStats and
// shown on the dashboard. No protocol name is ever special-cased.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  unknown_age_days: number;
  chain_step: number;
  chain_cap: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5,
  growth_floor: -40,
  growth_cap: 60,
  unknown_age_days: 365,
  chain_step: 0.025,
  chain_cap: 0.15,
};

/**
 * Sector mcap/TVL medians fitted from the snapshot's own 128 live-token comps
 * (positive mcap_usd, CoinGecko id and symbol on record), snapshot 2026-11-14.
 * GLOBAL is the all-comps median; sectors with fewer than 2 comps use it.
 */
export const SECTOR_MULTIPLE: Record<string, number> = {
  'Basis/Deriv': 1.0568,
  Bridge: 0.6776,
  Dexs: 0.3424,
  RWA: 0.2748,
  Other: 0.2227,
  Yield: 0.1914,
  Lending: 0.1505,
  CEX: 0.0748,
  LST: 0.0324,
};

export const GLOBAL_MULTIPLE = 0.2138;

/** Held-out validation of the comps curve, computed from the snapshot's live comps. */
export const FIT_STATS = {
  comps: 128,
  loo_median_x: 4.44,
  walkforward_train: 47,
  walkforward_test: 48,
  walkforward_cutoff: '2024-02-09',
  walkforward_median_x: 4.99,
};

/** Share of protocols that already trade, by age cohort (the token-odds prior). */
export const COHORT_LIVE_SHARE: Record<string, number> = {
  'young<180': 0.034,
  'mid180-540': 0.105,
  'mat541-900': 0.136,
  'old>900': 0.233,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 200;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  sector: string;
  multiple: number;
  token_odds: number;
  implied_value_usd: number;
  model: {
    multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    wait_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  sector: string;
  multiple: number;
  token_odds: number;
  implied_value_usd: number;
  growth_multiplier: number;
  wait_multiplier: number;
  chain_multiplier: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Age/size cohort odds plus the fitted validation numbers the dashboard shows. */
export interface RadarMeta {
  cohorts: Record<string, number>;
  fit: typeof FIT_STATS;
  global_multiple: number;
  sectors: Record<string, number>;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  meta: RadarMeta;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The protocol's sector bucket from its category string alone; never its name. */
export function sectorOf(p: SnapshotProtocol): string {
  const c = p.category ?? '';
  if (c === 'Dexs') return 'Dexs';
  if (c === 'Yield' || c === 'Yield Aggregator') return 'Yield';
  if (c === 'Lending' || c === 'CDP') return 'Lending';
  if (c === 'Liquid Staking' || c === 'Liquid Restaking' || c === 'Restaking' || c === 'Staking Pool') return 'LST';
  if (c === 'Bridge' || c === 'Canonical Bridge' || c === 'Cross Chain Bridge') return 'Bridge';
  if (c === 'RWA') return 'RWA';
  if (c === 'Basis Trading' || c === 'Derivatives' || c === 'Perpetuals' || c === 'Options') return 'Basis/Deriv';
  if (c === 'CEX') return 'CEX';
  return 'Other';
}

/** The fitted sector multiple for a protocol: its sector median, else the global median. */
export function multipleOf(p: SnapshotProtocol): number {
  return SECTOR_MULTIPLE[sectorOf(p)] ?? GLOBAL_MULTIPLE;
}

/** The TGE-wait multiplier over age_days: bootstrap 0.70x, prime window 1.25x, then 0.95x. */
export function waitMult(age: number | null, model: ModelConstants): number {
  const a = age ?? model.unknown_age_days;
  if (a <= 90) return 0.7;
  if (a <= 240) return 0.7 + ((a - 90) / 150) * 0.3;
  if (a <= 540) return 1.0 + ((a - 240) / 300) * 0.25;
  if (a <= 900) return 1.25 - ((a - 540) / 360) * 0.3;
  return 0.95;
}

/** The chain-breadth multiplier: +0.025 per extra chain, capped at +0.15. */
export function chainMult(p: SnapshotProtocol, model: ModelConstants): number {
  return 1 + Math.min(model.chain_cap, Math.max(0, p.chains.length - 1) * model.chain_step);
}

/** The age cohort key for token odds. */
export function cohortOf(age: number | null, model: ModelConstants): string {
  const a = age ?? model.unknown_age_days;
  if (a < 180) return 'young<180';
  if (a <= 540) return 'mid180-540';
  if (a <= 900) return 'mat541-900';
  return 'old>900';
}

/** The three multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
): { implied: number; growthPct: number; growthMult: number; wait: number; chains: number; age: number | null; multiple: number; odds: number } {
  const age = ageDays(asOf, protocol.listed_at);
  const multiple = multipleOf(protocol);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const wait = waitMult(age, model);
  const chains = chainMult(protocol, model);
  const odds = COHORT_LIVE_SHARE[cohortOf(age, model)] ?? 0.1;
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * growthMult * wait * chains));
  return { implied, growthPct, growthMult, wait, chains, age, multiple, odds };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no usable token market cap at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return !(typeof p.mcap_usd === 'number' && p.mcap_usd > 0 && p.gecko_id !== null && p.symbol !== null);
}

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: pre-token protocols below the watchlist floor, by TVL, capped. Never a replacement
  // for a watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model);
    return { p, v };
  });
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.v.age,
    sector: sectorOf(s.p),
    multiple: s.v.multiple,
    token_odds: Math.round(s.v.odds * 1000) / 1000,
    implied_value_usd: s.v.implied,
    model: {
      multiple: s.v.multiple,
      growth_pct: s.v.growthPct,
      growth_multiplier: round4(s.v.growthMult),
      wait_multiplier: round4(s.v.wait),
      chain_multiplier: round4(s.v.chains),
      age_days: s.v.age,
    },
    farm_steps: farmSteps(s.p, s.v.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** The gas character of a chain: L2s and Solana are cheap, Ethereum mainnet is not. */
function gasNote(chain: string): string {
  const c = chain.toLowerCase();
  if (c.includes('solana') || c.includes('base') || c.includes('arbitrum') || c.includes('optimism') || c.includes('polygon') || c.includes('linea') || c.includes('blast') || c.includes('monad') || c.includes('plume')) {
    return 'about $1 of gas';
  }
  return 'about $5 of gas';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The sector bucket's one action, in the words a farmer can follow. */
function actionFor(sector: string, p: SnapshotProtocol, capital: number, chain: string): string {
  const name = p.name;
  if (sector === 'Lending') return `Supply $${capital} of USDC to ${name} on ${chain} as collateral and borrow a small amount against it.`;
  if (sector === 'Dexs') return `Provide $${capital} of two-sided liquidity to ${name}'s main pool on ${chain} and keep the range in market.`;
  if (sector === 'Yield') return `Deposit $${capital} of USDC into ${name}'s highest-TVL vault on ${chain} and keep the shares.`;
  if (sector === 'Bridge') return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (sector === 'LST') return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt token.`;
  if (sector === 'RWA') return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (sector === 'Basis/Deriv') return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The sector bucket's second qualifying action: a different surface of the same protocol. */
function secondActionFor(sector: string, p: SnapshotProtocol, chain: string): string {
  const name = p.name;
  if (sector === 'Lending') return `Repay half the borrow on ${name}, then borrow again so the loan records two cycles.`;
  if (sector === 'Dexs') return `Route one swap a week through ${name} on ${chain} from the same wallet.`;
  if (sector === 'Yield') return `Compound the vault rewards on ${name} once a month instead of withdrawing.`;
  if (sector === 'Bridge') return `Bridge back a smaller amount through ${name} so the wallet shows round-trip volume.`;
  if (sector === 'LST') return `Use the receipt token in one listed DeFi pool on ${chain} so the stake records downstream use.`;
  if (sector === 'RWA') return `Reinvest one payout inside ${name} so the position records a second mint.`;
  if (sector === 'Basis/Deriv') return `Close and reopen the hedge once a month so the account records repeated margin use.`;
  return `Vote in one governance poll on ${name} from the same wallet, if it opens one.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (sector, chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const sector = sectorOf(p);
  const gas = gasNote(chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: actionFor(sector, p, capital, chain),
      cost: `$${capital} of capital and ${gas}`,
      time: '15 minutes to set up',
    },
    {
      text: `${secondActionFor(sector, p, chain)}`,
      cost: `${gas} a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    sector: row.sector,
    multiple: row.multiple,
    token_odds: row.token_odds,
    implied_value_usd: row.implied_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    wait_multiplier: row.model.wait_multiplier,
    chain_multiplier: row.model.chain_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    meta: {
      cohorts: COHORT_LIVE_SHARE,
      fit: FIT_STATS,
      global_multiple: GLOBAL_MULTIPLE,
      sectors: SECTOR_MULTIPLE,
    },
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
