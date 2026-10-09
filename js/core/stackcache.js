// The stack cache (objective.md §10): every result of one hand on one stack at one seed, kept so
// nothing is computed twice. The browser's cache and the shipped file (tools/precompute.mjs →
// data/stacks.json) are filled by the same job, so they hold the same numbers.
import { ALGOS, byId } from '../cards/index.js';
import { allHands } from './combos.js';
import { deckString } from './hand.js';
import { STACKS, stamp, seeded } from '../ui/stacks.js';

// The post cards are passes over a finished move list, so one run serves all 16 of their subsets.
// They are applied in this order: a hand that plays them in another order is measured on its own.
export const POSTS = ['noop-suppression', 'peephole-cancel', 'peephole-fuse', 'commutation-peephole'];
export const handKey = h => JSON.stringify([deckString(h), h.params || {}, h.presets || {}]);
export const stackKey = (b, seed) => seeded(b) ? `${b.id}@${seed}` : b.id;
// Every legal hand: each open role empty or filled, each Finisher (core/combos.js), and no post
// card, since the post subsets come with each run. Knobs stay at their defaults.
let HANDS = null;
export const everyHand = () => (HANDS ??= ALGOS.flatMap(a => allHands(a).legal));
export const runnable = (h, b) => { const a = byId[h.algo]; return a.maxN == null || b.n <= a.maxN; };
// A precomputed cell is found by its hand's cards in any order (slot cards and Finishers do not
// depend on it), plus its post cards, which must come in POSTS order.
const canon = (algo, techs, h) => [algo, ...techs.slice().sort(), ...(h.finisher === null ? ['no-finisher'] : []), ...(h.sharing === false ? ['no-sharing'] : [])].join('+');
export const baseKey = h => canon(h.algo, h.techs || [], h);
function split(h) {
  if (Object.keys(h.params || {}).length || Object.keys(h.presets || {}).length) return null;
  const techs = h.techs || [], posts = techs.filter(t => POSTS.includes(t));
  if (posts.some((t, i) => i && POSTS.indexOf(t) < POSTS.indexOf(posts[i - 1]))) return null;
  return { base: canon(h.algo, techs.filter(t => !POSTS.includes(t)), h), mask: posts.reduce((m, t) => m | (1 << POSTS.indexOf(t)), 0) };
}
// A record from the moves of one run per seed: the stamp, and for a set of orders the worst one.
export function record(b, ops) { const w = ops.indexOf(Math.max(...ops)); return { s: stamp(b, ops[w]), ops: ops[w], worst: b.seeds ? b.seeds[w] : null }; }
// A cell kept small: per post subset, the moves, or for a set of orders [worst moves, which order].
export function compact(b, moves) { return moves.map(ops => { const w = ops.indexOf(Math.max(...ops)); return b.seeds ? [ops[w], b.seeds[w]] : ops[0]; }); }
const fromCell = (b, v) => Array.isArray(v) ? { s: stamp(b, v[0]), ops: v[0], worst: v[1] } : { s: stamp(b, v), ops: v, worst: null };

export class StackCache {
  constructor() { this.live = new Map(); this.cells = new Map(); }   // handKey → stackKey → record; cellKey → [16 × moves per seed]
  cellKey(base, b, seed) { return `${base}\t${stackKey(b, seed)}`; }
  get(h, b, seed) {
    const hit = this.live.get(handKey(h))?.[stackKey(b, seed)]; if (hit) return hit;
    const k = split(h), c = k && this.cells.get(this.cellKey(k.base, b, seed));
    return c ? fromCell(b, c[k.mask]) : null;
  }
  put(h, b, seed, rec) { this.putRaw(handKey(h), stackKey(b, seed), rec); }
  putRaw(hk, sk, rec) { if (!this.live.has(hk)) this.live.set(hk, {}); this.live.get(hk)[sk] = rec; }
  // One cell: a legal hand on a stack, its 16 post subsets in compact form.
  putCell(base, b, seed, cell) { this.cells.set(this.cellKey(base, b, seed), cell); }
  putCellRaw(base, sk, cell) { this.cells.set(`${base}\t${sk}`, cell); }
  hasBase(h, b, seed) { return this.cells.has(this.cellKey(baseKey(h), b, seed)) || !!this.live.get(handKey(h))?.[stackKey(b, seed)]; }
  // The shipped file: { version, seed, posts, stacks, hands: { base: [cell per stack] } }, where a
  // cell is the compact form: 16 move counts, or 16 [worst moves, order] for a set of orders.
  ingest(file) {
    const seed = file.seed, stacks = file.stacks.map(id => STACKS.find(b => b.id === id));
    for (const [base, row] of Object.entries(file.hands)) row.forEach((moves, i) => { if (moves && stacks[i]) this.putCell(base, stacks[i], seed, moves); });
  }
}
// The share of every legal hand × every stack the cache holds at a seed: the ☢ meter.
export function filled(cache, seed) {
  let have = 0, all = 0;
  for (const h of everyHand()) for (const b of STACKS) { all++; if (!runnable(h, b) || cache.hasBase(h, b, seed)) have++; }
  return have / all;
}
