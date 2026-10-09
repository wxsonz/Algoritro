// The Adaptive Selector: measure disorder, dispatch to the simple, medium or complex hand, after
// the tiny cases. The Table's build is exactly this.
import { runHand, resolve } from './hand.js';
import { disorder, lisLength, runs } from './input.js';

// Disorder metrics, each in [0, 1] with 0 for sorted input. 'inversions' is the subject's.
export const METRICS = {
  inversions: { name: 'inversions ÷ pairs (the subject\'s)', of: disorder },
  runs: { name: 'ascending runs: (runs − 1) ÷ (n − 1)', of: r => r.length < 2 ? 0 : (runs(r).count - 1) / (r.length - 1) },
  lis: { name: 'LIS deficit: (n − LIS) ÷ (n − 1)', of: r => r.length < 2 ? 0 : (r.length - lisLength(r)) / (r.length - 1) },
  displacement: { name: 'mean displacement ÷ (n ÷ 2)', of: r => r.length < 2 ? 0 : r.reduce((s, x, i) => s + Math.abs(x - i), 0) / r.length / (r.length / 2) },
};
export const SUBJECT_THRESHOLDS = { low: 0.2, high: 0.5 };
// Each regime's class target: whatever runs there must be at least this good.
export const TARGETS = { simple: 'n²', medium: 'n√n', complex: 'n log n' };
const RANK = { '1': 0, 'n log n': 1, 'n√n': 2, 'n²': 3, exponential: 9, heuristic: 9 };
export const meetsTarget = (cls, target) => cls in RANK && RANK[cls] <= RANK[target];

export function regimeOf(r, { thresholds = SUBJECT_THRESHOLDS, metric = 'inversions' } = {}) {
  const d = METRICS[metric].of(r);
  return { d, regime: d < thresholds.low ? 'simple' : d < thresholds.high ? 'medium' : 'complex' };
}

// Tiny stacks come first, as in any push_swap: three numbers or fewer take the hardcoded cases,
// four or five the Oracle's search (120 orders at most: a BFS or a lookup table in C), which is
// optimal, 8 moves for the worst order of 5 where Five Hand needs 10. No disorder regime applies
// to them, and the subject caps them at 3 and 12 moves.
export const TINY_MAX = 5;
export const tinyCard = n => n <= 3 ? 'hardcoded-three' : 'oracle';
// Where an input goes: the tiny seat by its size, else the flag its disorder picks.
export function routeOf(r, opts) {
  const { d, regime } = regimeOf(r, opts);
  return { d, route: r.length <= TINY_MAX ? 'tiny' : regime };
}
// build: { simple: hand, medium: hand, complex: hand }
export function runAdaptive(build, ranks, opts = {}) {
  const { d, route } = routeOf(ranks, opts);
  if (route === 'tiny') { const id = tinyCard(ranks.length); return { ...runHand({ algo: id, techs: [], sandbox: true }, ranks), regime: 'tiny', tinyCard: id, disorder: d }; }
  const res = runHand(build[route], ranks);
  return { ...res, regime: route, disorder: d };
}

// Does a hand's class claim hold on its params? A param that stops growing on a card that claims
// O(n√n) is flagged without measuring (spec/09). Returns the reasons it does not.
import { byId, techById } from '../cards/index.js';
export function classProblems(hand) {
  const a = byId[hand.algo], out = [];
  for (const [k, p] of Object.entries(a.params || {})) {
    if (p.grows === undefined) continue;
    const grows = hand.params?.[k] != null ? false : hand.presets?.[k] ? /√n|log/.test(hand.presets[k]) : p.grows;
    if (!grows && a.claimedClass === 'n√n') out.push(`${a.name}'s ${p.label} does not grow with n, so O(n√n) does not hold`);
  }
  // A card in play can void the host's class argument (one that says so: breaksClass), played or
  // a default: bare Chunks sweeps by nearest member, so it has no O(n√n) bound without One-Way Sweep.
  const R = resolve(hand), inPlay = new Set([...(hand.techs || []), ...Object.values(R.use || {}).map(u => u.id)]);
  for (const id of inPlay) { const t = techById[id]; if (t?.breaksClass === a.claimedClass) out.push(`${t.name}: ${t.breaksWhy}`); }
  return out;
}
// A build complies when every regime's hand meets that regime's class target.
export function buildCompliance(build) {
  const problems = [];
  for (const regime of ['simple', 'medium', 'complex']) {
    const h = build[regime], a = byId[h.algo];
    if (!meetsTarget(a.claimedClass, TARGETS[regime])) problems.push(`${regime}: ${a.name} is O(${a.claimedClass}), the target is O(${TARGETS[regime]})`);
    for (const p of classProblems(h)) problems.push(`${regime}: ${p}`);
  }
  return { ok: problems.length === 0, problems };
}
