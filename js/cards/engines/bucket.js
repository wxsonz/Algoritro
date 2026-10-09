// The Bucket family's engines, ported from spec/sim/buckets.mjs and cards.mjs: Chunks with its
// sweep, band and retrieval roles, Butterfly, Bucket Insertion and Annealed Plan.
import { cost2, cost4, exec, slotA } from '../lib.js';
import { rng } from '../../core/rng.js';

export const equalCuts = (n, K) => { const w = Math.ceil(n / K), c = []; for (let i = 0; i <= K; i++) c.push(Math.min(n, i * w)); return c; };

// Retrieval from B into A.
//   max (Max Retrieval) | second (Second-Max Lookahead) | rank (Rank-Range Max: the same ops)
//   cheapest (Cheapest Return) | bucket (Cheapest Return within the highest bucket left, needs cuts)
export function retrieve(m, kind = 'max', { cost = 2, cuts = null } = {}) {
  m.phase('retrieve').overlay(null);
  if (kind === 'max' || kind === 'second' || kind === 'rank') { retrieveMax(m, kind); return; }
  const bucketOf = x => { let c = 0; while (cuts[c + 1] <= x) c++; return c; };
  while (m.b.length) {
    const A = m.a, B = m.b, ma = A.length, mb = B.length;
    let p = 0; for (let i = 1; i < ma; i++) if (A[i] < A[p]) p = i;
    let top = -1; if (kind === 'bucket') for (const x of B) top = Math.max(top, bucketOf(x));
    let best = null, bi = -1;
    for (let i = 0; i < mb; i++) {
      if (kind === 'bucket' && bucketOf(B[i]) !== top) continue;
      const c = (cost === 4 ? cost4 : cost2)(slotA(A, p, B[i]), Math.max(ma, 1), i, mb);
      if (!best || c[0] < best[0]) { best = c; bi = i; }
    }
    if (kind === 'bucket') m.overlay('range', [cuts[top], cuts[top + 1]]);
    m.focus({ mover: B[bi] }).why(`cheapest return${kind === 'bucket' ? ' in the highest bucket' : ''}: ${B[bi]}, ${best[0]} rotations`);
    exec(m, best); m.op('pa');
  }
  m.focus(null).overlay(null).phase('align').why('rotate the minimum to the top').bring('a', m.a.indexOf(0));
}
function retrieveMax(m, kind) {
  const dist = (L, i) => Math.min(i, L - i);
  while (m.b.length) {
    const B = m.b, L = B.length; let im = 0; for (let j = 1; j < L; j++) if (B[j] > B[im]) im = j;
    if (kind === 'second' && L > 1) {
      let is = -1; for (let j = 0; j < L; j++) if (j !== im && (is < 0 || B[j] > B[is])) is = j;
      if (dist(L, is) + 2 < dist(L, im)) {
        m.focus({ mover: B[is], target: B[im] }).why(`the runner-up ${B[is]} is ${dist(L, is)} away, the max ${dist(L, im)}: take it first`).bring('b', is).op('pa');
        const B2 = m.b, L2 = B2.length; let jm = 0; for (let j = 1; j < L2; j++) if (B2[j] > B2[jm]) jm = j;
        m.why('then the max').bring('b', jm).op('pa'); m.why('and swap them into order').op('sa');
        continue;
      }
    }
    m.focus({ mover: B[im] }).why(kind === 'rank' ? `the next expected rank is ${B[im]}` : `bring B's max (${B[im]}) up, ${dist(L, im)} away`).bring('b', im).op('pa');
  }
  m.focus(null);
}

// Chunks over explicit cut points.
//   sweep: nearest (Nearest-Member) | oneway (One-Way) | ra (a blind ra sweep)
//   band: sink (rb Sink) | middle (Middle-Out Push)      ret / cost: see retrieve()
export function chunks(m, cuts, { sweep = 'nearest', band = 'sink', ret = 'max', cost = 2 } = {}) {
  const n = m.a.length, K = cuts.length - 1;
  const half = Math.ceil(n / Math.max(1, K)) / 2;
  const mid = K >> 1, order = [];
  if (band === 'middle') { order.push(mid); for (let d = 1; order.length < K; d++) { if (mid + d < K) order.push(mid + d); if (mid - d >= 0) order.push(mid - d); } }
  else for (let c = 0; c < K; c++) order.push(c);
  for (const c of order) {
    const lo = cuts[c], hi = cuts[c + 1], mem = x => x >= lo && x < hi; let left = hi - lo;
    m.phase(`chunk ${c + 1}/${K}`).overlay('range', [lo, hi]);
    const sinkAll = band === 'middle' && c < mid;
    const push = () => {
      const v = m.a[0]; m.why(`${v} is in [${lo}, ${hi}): push it`).op('pb'); left--;
      if (m.b.length > 1 && (band === 'middle' ? sinkAll : v < lo + half)) m.why(band === 'middle' ? 'this chunk is below the middle: sink it' : `${v} is in the chunk's lower half: sink it`).op('rb');
    };
    if (sweep === 'nearest') {
      while (left > 0) {
        const A = m.a, f = A.findIndex(mem); let bk = -1;
        for (let i = A.length - 1; i >= 0; i--) if (mem(A[i])) { bk = i; break; }
        if (f <= A.length - bk) m.why(`nearest member is ${f} down`).op('ra', f); else m.why(`nearest member is ${A.length - bk} up from the bottom`).op('rra', A.length - bk);
        push();
      }
    } else {
      const A = m.a; let k = 0, last = -1, below = -1;
      for (let i = 0; i < A.length; i++) if (mem(A[i])) { k++; last = i; if (i > 0 && below < 0) below = i; }
      const raCost = last + 1 - k, rraCost = below < 0 ? 0 : A.length - below;
      const fwd = sweep === 'ra' || raCost <= rraCost;
      while (left > 0) { if (mem(m.a[0])) push(); else m.why(fwd ? `one-way ra sweep (${raCost} vs ${rraCost} for rra)` : `one-way rra sweep (${rraCost} vs ${raCost} for ra)`).op(fwd ? 'ra' : 'rra'); }
    }
  }
  retrieve(m, ret, { cost, cuts });
}

// Butterfly: the window rule. x ≤ i → pb rb; x ≤ i + w → pb; else ra. Then retrieve.
export function butterfly(m, w, { ret = 'max', cost = 2 } = {}) {
  let i = 0;
  m.phase('window');
  while (m.a.length) {
    const x = m.a[0];
    m.overlay('range', [i, i + w + 1]);
    if (x <= i) { m.why(`${x} ≤ i = ${i}: push and sink it`).op('pb'); m.op('rb'); i++; }
    else if (x <= i + w) { m.why(`${x} ≤ i + w = ${i + w}: push it`).op('pb'); i++; }
    else m.why(`${x} > i + w = ${i + w}: rotate past it`).op('ra');
  }
  retrieve(m, ret, { cost });
}

// Bucket Insertion: buckets of ⌊c·√n⌋ ranks (c = 4 in the reference build), One-Way Sweep,
// rb Sink, then cheapest insertion restricted to the highest bucket left.
export function bucketCuts(n, c = 4) {
  const w = Math.max(1, Math.floor(Math.sqrt(c * c * n))), cuts = [];
  for (let x = 0; x < n; x += w) cuts.push(x); cuts.push(n);
  return cuts;
}

// Annealed Plan over chunk boundaries: perturb one boundary, re-run on a scratch machine, keep
// the change if it is better (or, with a falling probability, if it is worse). Seeded per input.
export function annealCuts(ranks, K, run, { budget = 200, seed = 1 } = {}) {
  const n = ranks.length, rnd = rng(seed * 7919 + n);
  let cuts = equalCuts(n, K), cur = run(cuts), best = cur, bestCuts = cuts;
  const T0 = 0.003 * cur;
  for (let it = 0; it < budget && K >= 2; it++) {
    const T = T0 * (1 - it / budget) + 1e-9, i = 1 + Math.floor(rnd() * (K - 1));
    const d = (1 + Math.floor(rnd() * 3)) * (rnd() < 0.5 ? -1 : 1), v = cuts[i] + d;
    if (v <= cuts[i - 1] || v >= cuts[i + 1]) continue;
    const next = cuts.slice(); next[i] = v;
    const val = run(next);
    if (val <= cur || rnd() < Math.exp(-(val - cur) / T)) { cuts = next; cur = val; if (val < best) { best = val; bestCuts = next; } }
  }
  return bestCuts;
}
