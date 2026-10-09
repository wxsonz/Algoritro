// Bucket-family variants: explicit chunk boundaries, Middle-Out Push, Cheapest Return, the
// Bucket Insertion card, and Annealed Plan over chunk boundaries. With default options,
// chunksX() reproduces cards.mjs's chunks() op for op.
import { S, cost2, cost4, exec, mulberry32 } from './lib.mjs';
import { slotA } from './engines.mjs';

export const equalCuts = (n, K) => { const w = Math.ceil(n / K), c = []; for (let i = 0; i <= K; i++) c.push(Math.min(n, i * w)); return c; };

//   cuts: chunk boundaries        sweep: nearest | oneway | ra       band: sink (rb Sink) | middle (Middle-Out Push)
//   ret: max | second (Second-Max) | cheapest (Cheapest Return) | bucket (Cheapest Return within the top bucket)
//   cost: 2 | 4 for the cheapest returns
export function chunksX(r, cuts, { sweep = 'nearest', band = 'sink', ret = 'max', cost = 2 } = {}) {
  const m = new S.M(r), n = r.length, K = cuts.length - 1;
  const half = Math.ceil(n / Math.max(1, K)) / 2;        // rb Sink: the lower half of a nominal chunk
  const mid = K >> 1, order = [];
  if (band === 'middle') { order.push(mid); for (let d = 1; order.length < K; d++) { if (mid + d < K) order.push(mid + d); if (mid - d >= 0) order.push(mid - d); } }
  else for (let c = 0; c < K; c++) order.push(c);
  for (const c of order) {
    const lo = cuts[c], hi = cuts[c + 1], mem = x => x >= lo && x < hi; let left = hi - lo;
    const sinkAll = band === 'middle' && c < mid;
    const push = () => {
      const v = m.A[0]; m.op('pb'); left--;
      if (m.B.length > 1 && (band === 'middle' ? sinkAll : v < lo + half)) m.op('rb');
    };
    if (sweep === 'nearest') {
      while (left > 0) {
        const A = m.A, f = A.findIndex(mem); let bk = -1;
        for (let i = A.length - 1; i >= 0; i--) if (mem(A[i])) { bk = i; break; }
        if (f <= A.length - bk) m.op('ra', f); else m.op('rra', A.length - bk);
        push();
      }
    } else {
      const A = m.A; let k = 0, last = -1, below = -1;
      for (let i = 0; i < A.length; i++) if (mem(A[i])) { k++; last = i; if (i > 0 && below < 0) below = i; }
      const fwd = sweep === 'ra' || (last + 1 - k) <= (below < 0 ? 0 : A.length - below);
      while (left > 0) { if (mem(m.A[0])) push(); else m.op(fwd ? 'ra' : 'rra'); }
    }
  }
  if (ret === 'max' || ret === 'second') { retrieveMax(m, ret === 'second'); return m; }
  // Cheapest Return: insert into A's circular order, optionally only from the highest bucket left.
  const bucketOf = x => { let c = 0; while (cuts[c + 1] <= x) c++; return c; };
  while (m.B.length) {
    const A = m.A, B = m.B, ma = A.length, mb = B.length;
    let p = 0; for (let i = 1; i < ma; i++) if (A[i] < A[p]) p = i;
    let top = -1; if (ret === 'bucket') for (const x of B) top = Math.max(top, bucketOf(x));
    let best = null;
    for (let i = 0; i < mb; i++) {
      if (ret === 'bucket' && bucketOf(B[i]) !== top) continue;
      const c = (cost === 4 ? cost4 : cost2)(slotA(A, p, B[i]), Math.max(ma, 1), i, mb);
      if (!best || c[0] < best[0]) best = c;
    }
    exec(m, best); m.op('pa');
  }
  m.bring('A', m.A.indexOf(0), 'ra', 'rra');
  return m;
}
function retrieveMax(m, second) {
  const dist = (L, i) => Math.min(i, L - i);
  while (m.B.length) {
    const B = m.B, L = B.length; let im = 0; for (let j = 1; j < L; j++) if (B[j] > B[im]) im = j;
    if (second && L > 1) {
      let is = -1; for (let j = 0; j < L; j++) if (j !== im && (is < 0 || B[j] > B[is])) is = j;
      if (dist(L, is) + 2 < dist(L, im)) {
        m.bring('B', is, 'rb', 'rrb'); m.op('pa');
        const B2 = m.B, L2 = B2.length; let jm = 0; for (let j = 1; j < L2; j++) if (B2[j] > B2[jm]) jm = j;
        m.bring('B', jm, 'rb', 'rrb'); m.op('pa'); m.op('sa');
        continue;
      }
    }
    m.bring('B', im, 'rb', 'rrb'); m.op('pa');
  }
}

// Bucket Insertion as the reference build describes it: buckets of ⌊4√n⌋ ranks, One-Way Sweep,
// rb Sink, then cheapest insertion restricted to the highest bucket left.
export function bucketInsertion(r, { cost = 2 } = {}) {
  const n = r.length, w = Math.max(1, Math.floor(Math.sqrt(16 * n))), cuts = [];
  for (let x = 0; x < n; x += w) cuts.push(x); cuts.push(n);
  return chunksX(r, cuts, { sweep: 'oneway', ret: 'bucket', cost });
}

// Annealed Plan over chunk boundaries: perturb one boundary, re-run, keep the change if it is
// better (or, with a falling probability, if it is worse). Seeded per input, so deterministic.
export function annealChunks(r, K, { budget = 200, seed = 1, opts = {} } = {}) {
  const n = r.length, rnd = mulberry32(seed * 7919 + n);
  const evalCuts = c => chunksX(r, c, opts).n;
  let cuts = equalCuts(n, K), cur = evalCuts(cuts), best = cur, bestCuts = cuts;
  const T0 = 0.003 * cur;
  for (let it = 0; it < budget && K >= 2; it++) {
    const T = T0 * (1 - it / budget) + 1e-9, i = 1 + Math.floor(rnd() * (K - 1));
    const d = (1 + Math.floor(rnd() * 3)) * (rnd() < 0.5 ? -1 : 1), v = cuts[i] + d;
    if (v <= cuts[i - 1] || v >= cuts[i + 1]) continue;
    const next = cuts.slice(); next[i] = v;
    const val = evalCuts(next);
    if (val <= cur || rnd() < Math.exp(-(val - cur) / T)) { cuts = next; cur = val; if (val < best) { best = val; bestCuts = next; } }
  }
  const m = chunksX(r, bestCuts, opts); m.cuts = bestCuts; return m;
}
