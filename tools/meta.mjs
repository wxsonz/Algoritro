// Offline Meta generation (spec/05): measures every card, technique, technique pair, deck and build,
// and writes data/meta.json for the Table, Codex, Meta and Lab pages.
// Usage: node tools/meta.mjs [--quick]   (--quick: fewer seeds, for a fast check)
import { writeFile } from 'node:fs/promises';
import { pool } from './pool.mjs';
import { ALGOS, TECHS, byId, techById } from '../js/cards/index.js';
import { DECKS, BUILDS } from '../js/cards/decks.js';
import { fits, resolve, deckString } from '../js/core/hand.js';
import { buildCompliance, classProblems, TARGETS, meetsTarget } from '../js/core/meta-run.js';
import { stats, passRate, grade, paired, interaction, classCheck, CLASS_F, GROWTH_SIZES, OFFLINE_SIZES } from '../js/core/metrics.js';
import { loadData } from '../js/core/data.js';

const QUICK = process.argv.includes('--quick');
const SEEDS = await loadData('seeds');
const P = pool(); console.log(`pool of ${P.size} workers${QUICK ? ', quick mode' : ''}`);
const t0 = Date.now(), log = s => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}`);
const take = (n, k) => SEEDS[n] ? SEEDS[n].slice(0, k) : Array.from({ length: k }, (_, i) => 1000 + i);
const S100 = QUICK ? 12 : 50, S500 = QUICK ? 4 : 20;
const SLOW = { 'beam-sorter': 8, annealer: 10, 'lookahead-greedy': 20 };
const H = (algo, techs = [], extra = {}) => ({ algo, techs, sandbox: true, sharing: true, ...extra });

// Run a hand on seeds, split across the pool. Results are cached by hand, n, generator and seeds.
const cache = new Map();
function measure(hand, n, seeds, gen = 'uniform', param) {
  const key = JSON.stringify([hand, n, seeds[0], seeds.length, gen, param]);
  if (cache.has(key)) return cache.get(key);
  const chunk = Math.max(1, Math.ceil(seeds.length / 8)), parts = [];
  for (let i = 0; i < seeds.length; i += chunk) parts.push(P.run({ kind: 'hand', hand, n, gen, param, seeds: seeds.slice(i, i + chunk) }));
  const p = Promise.all(parts).then(rs => { const ops = rs.flatMap(r => r.ops), ms = rs.flatMap(r => r.ms); if (rs.some(r => r.invalid)) throw new Error(`invalid stream: ${deckString(hand)} n=${n}`); return { ops, ms }; });
  cache.set(key, p); return p;
}
const summary = (n, ops, ms) => { const s = stats(ops); return { n, mean: +s.mean.toFixed(1), sd: +s.sd.toFixed(1), min: s.min, max: s.max, spread: +s.spread.toFixed(3), grade: grade(n, s.mean), pass: passRate(n, ops), ms: ms ? median(ms) : undefined, runs: ops.length }; };
const median = xs => { const s = xs.slice().sort((a, b) => a - b); return +s[s.length >> 1].toFixed(2); };
const at = async (hand, n, k) => { const { ops, ms } = await measure(hand, n, take(n, k)); return { ...summary(n, ops, ms), ops }; };

// 1. Bare cards: means, spread, pass rates, speed, growth, class check, disorder curve.
const SMALL_N = { 'hardcoded-three': 3, 'five-hand': 5, oracle: 7 };
async function cardStats(a) {
  const out = { at: {} };
  if (SMALL_N[a.id]) { const n = SMALL_N[a.id]; const r = await at(H(a.id), n, n === 7 ? 50 : 50); delete r.ops; out.at[n] = r; out.speedMs = r.ms; out.speedN = n; return out; }
  const hand = H(a.id);
  const r100 = await at(hand, 100, S100); delete r100.ops; out.at[100] = r100;
  if (!a.maxN || a.maxN >= 500) { const r500 = await at(hand, 500, SLOW[a.id] ? Math.min(SLOW[a.id], S500) : S500); delete r500.ops; out.at[500] = r500; out.speedMs = r500.ms; out.speedN = 500; }
  else { out.speedMs = r100.ms; out.speedN = 100; }
  // Growth.
  const heavy = a.claimedClass === 'heuristic' || a.id === 'lookahead-greedy';
  const sizes = [...GROWTH_SIZES, ...(heavy || (a.maxN && a.maxN < 2048) ? [] : OFFLINE_SIZES)].filter(n => (!a.maxN || n <= a.maxN) && !(heavy && n > 500));
  out.growth = [];
  for (const n of sizes) { const { ops } = await measure(hand, n, take(n, n >= 2048 ? 2 : n >= 500 ? 4 : 8)); out.growth.push([n, +stats(ops).mean.toFixed(1)]); }
  if (CLASS_F[a.claimedClass] && out.growth.some(([n]) => n > 1000)) { const c = classCheck(out.growth, a.claimedClass); out.classCheck = { flagged: c.flagged, checks: c.checks.map(x => ({ n: x.n, excess: +x.excess.toFixed(4) })) }; }
  out.paramFlags = classProblems(hand);
  // Disorder curve at n=100.
  out.disorder = [];
  for (const d of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]) { const { ops } = await measure(hand, 100, take(100, 10), 'disorder', d); out.disorder.push([d, +stats(ops).mean.toFixed(1)]); }
  return out;
}

// 2. Technique effects: Δ on every host the card fits, paired with the bare host.
const POST_HOSTS = ['lsd-radix', 'chunks', 'butterfly', 'turk', 'lis-insertion', 'four-end-quicksort', 'bucket-insertion', 'quick-2way', 'insert-into-b'];
async function effect(base, variant, n, k, gen, param) {
  const [a, b] = await Promise.all([measure(base, n, take(n, k), gen, param), measure(variant, n, take(n, k), gen, param)]);
  const d = paired(a.ops, b.ops);
  return { n, delta: +d.mean.toFixed(2), se: +d.se.toFixed(2), runs: d.n, variant: { ...summary(n, b.ops), ops: undefined } };
}
async function techEffects(t) {
  const rows = [];
  if (t.role === 'prep') {
    if (t.id !== 'presorted-shortcut') return rows;
    for (const host of ['lsd-radix', 'turk', 'four-end-quicksort', 'chunks']) {
      const e = await effect(H(host), H(host, [t.id]), 100, 10, 'rotated', 25);
      rows.push({ host, input: 'rotated by n/4', at: { 100: e } });
    }
    return rows;
  }
  let hosts;
  if (t.id === 'double-op-sharing') hosts = ['turk', 'lis-insertion', 'simple-insertion'];
  else if (t.role === 'post') hosts = POST_HOSTS;
  else hosts = ALGOS.filter(a => fits(a, t).ok).map(a => a.id);
  for (const host of hosts) {
    const a = byId[host], base = H(host);
    if (a.maxN && a.maxN < 100) continue;
    let variant = t.id === 'double-op-sharing' ? H(host, [], { sharing: false }) : H(host, [t.id]);
    // A card that needs a pick on a host without one is measured with Cheapest Pick in both arms.
    if (!resolve(variant).ok && t.requires.includes('pick') && fits(a, techById['cheapest-pick']).ok) { base.techs = ['cheapest-pick']; variant = H(host, ['cheapest-pick', t.id]); }
    if (!resolve(variant).ok) continue;
    if (a.defaults[t.role] === t.id) continue;               // the host's own default
    const row = { host, base: deckString(base), at: {} };
    row.at[100] = await effect(base, variant, 100, S100);
    if (!a.maxN || a.maxN >= 500) row.at[500] = await effect(base, variant, 500, (t.id === 'beam-over-orders' || SLOW[host]) ? Math.min(8, S500) : S500);
    rows.push(row);
  }
  return rows;
}

// 3. Interactions on each host with at least two roles or a Finisher.
const INTER_HOSTS = ['simple-insertion', 'lis-insertion', 'turk', 'chunks', 'butterfly', 'bucket-insertion', 'quick-2way', 'four-end-quicksort', 'insert-into-b'];
async function interactions(host) {
  const a = byId[host], cards = TECHS.filter(t => (t.role !== 'post' && t.role !== 'prep') && fits(a, t).ok && a.defaults[t.role] !== t.id)
    .concat(TECHS.filter(t => ['peephole-cancel', 'peephole-fuse'].includes(t.id)));
  const out = [];
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const x = cards[i], y = cards[j];
    if (x.role === y.role && x.role !== 'post') continue;
    let base = H(host), first = H(host, [x.id]), second = H(host, [y.id]), both = H(host, [x.id, y.id]);
    if (!resolve(both).ok) {
      // Requirements on another role (pick): measure on top of Cheapest Pick when the host takes it.
      if (fits(a, techById['cheapest-pick']).ok && x.id !== 'cheapest-pick' && y.id !== 'cheapest-pick') { const cp = ['cheapest-pick']; base = H(host, cp); first = H(host, [...cp, x.id]); second = H(host, [...cp, y.id]); both = H(host, [...cp, x.id, y.id]); }
      if (!resolve(both).ok || !resolve(first).ok || !resolve(second).ok) continue;
    }
    if (!resolve(first).ok || !resolve(second).ok) continue;
    const row = { a: x.id, b: y.id, at: {} };
    for (const n of [100, 500]) {
      if (a.maxN && n > a.maxN) continue;
      const k = n === 100 ? S100 : Math.min(10, S500);
      const heavy = [x.id, y.id].some(id => id === 'beam-over-orders' || id === 'annealed-plan');
      if (n === 500 && heavy) continue;
      const [b0, b1, b2, b3] = await Promise.all([base, first, second, both].map(h => measure(h, n, take(n, k))));
      const r = interaction(b0.ops, b1.ops, b2.ops, b3.ops);
      row.at[n] = { I: +r.I.toFixed(2), se: +r.se.toFixed(2), badge: r.badge, both: +stats(b3.ops).mean.toFixed(1) };
    }
    out.push(row);
  }
  return out;
}

// 4. Builds.
async function buildStats(b) {
  const out = { id: b.id, name: b.name, decks: { simple: deckString(b.simple), medium: deckString(b.medium), complex: deckString(b.complex) }, compliance: buildCompliance(b), at: {}, sim: b.sim };
  for (const n of [100, 500]) {
    const seeds = take(n, n === 100 ? S100 : S500), chunk = Math.ceil(seeds.length / 8), parts = [];
    for (let i = 0; i < seeds.length; i += chunk) parts.push(P.run({ kind: 'build', build: b, n, seeds: seeds.slice(i, i + chunk) }));
    const rs = await Promise.all(parts), ops = rs.flatMap(r => r.ops), regimes = rs.flatMap(r => r.regimes);
    out.at[n] = { ...summary(n, ops), regimes: Object.fromEntries(['simple', 'medium', 'complex'].map(g => [g, regimes.filter(x => x === g).length / regimes.length])) };
  }
  return out;
}

// 5. Disorder winners at n=100 and 500: the cheapest hand per level, and per regime among hands
// that meet its class target.
async function disorderWinners() {
  const cands = [...DECKS.map(d => ({ name: d.name, hand: d.hand })), { name: 'Butterfly √n', hand: H('butterfly', [], { presets: { w: 'round(1.4√n)' } }) }, { name: 'Natural Merge', hand: H('natural-merge') }, { name: 'Tape Merge', hand: H('tape-merge') }];
  const levels = [0, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  const out = {};
  for (const n of [100, 500]) {
    const rows = [];
    for (const d of levels) {
      const means = await Promise.all(cands.map(c => measure(c.hand, n, take(n, n === 100 ? 10 : 4), 'disorder', d).then(r => stats(r.ops).mean)));
      const regime = d < 0.2 ? 'simple' : d < 0.5 ? 'medium' : 'complex';
      let best = -1, bestOk = -1;
      means.forEach((m, i) => { if (best < 0 || m < means[best]) best = i; const cls = byId[cands[i].hand.algo].claimedClass; if (meetsTarget(cls, TARGETS[regime]) && !classProblems(cands[i].hand).length && (bestOk < 0 || m < means[bestOk])) bestOk = i; });
      rows.push({ d, regime, means: means.map(m => +m.toFixed(1)), winner: best, compliantWinner: bestOk });
    }
    out[n] = rows;
  }
  return { hands: cands.map(c => ({ name: c.name, deck: deckString(c.hand), presets: c.hand.presets || null })), levels, at: out };
}

// Run everything.
const meta = { generated: new Date().toISOString().slice(0, 10), quick: QUICK, seeds: { 100: S100, 500: S500 }, cards: {}, techniques: {}, decks: {}, builds: [], interactions: {} };
log('cards');
await Promise.all(ALGOS.map(async a => { meta.cards[a.id] = await cardStats(a); log(`  ${a.id}`); }));
log('decks');
await Promise.all(DECKS.map(async d => {
  const r100 = await at(d.hand, 100, S100), r500 = await at(d.hand, 500, S500), R = resolve(d.hand);
  delete r100.ops; delete r500.ops;
  meta.decks[d.id] = { name: d.name, deck: deckString(d.hand), presets: d.hand.presets || null, at: { 100: r100, 500: r500 }, sim: d.sim, ref: d.ref || null, grasp: R.grasp, craft: R.craft, note: d.note };
}));
log('techniques');
await Promise.all(TECHS.filter(t => !t.unbuildable).map(async t => { meta.techniques[t.id] = { effects: await techEffects(t) }; log(`  ${t.id}`); }));
log('interactions');
await Promise.all(INTER_HOSTS.map(async h => { meta.interactions[h] = await interactions(h); log(`  ${h}: ${meta.interactions[h].length} pairs`); }));
log('builds');
meta.builds = await Promise.all(BUILDS.map(buildStats));
log('disorder winners');
meta.disorder = await disorderWinners();
await writeFile(new URL('../data/meta.json', import.meta.url), JSON.stringify(meta) + '\n');
log('wrote data/meta.json');
await P.close();
