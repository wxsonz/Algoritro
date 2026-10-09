// Cards and measurements added after the technique pass: Natural Merge, exact-disorder inputs,
// worst-case search, and the chunk-size schedule.
import { S, mulberry32, shuf, run } from './lib.mjs';

// Natural Merge: merge neighbouring ascending runs of A, pass after pass. For each pair, the first
// run goes to B (pb), then both are merged smallest first onto A's bottom: a value of the second
// run is still on A's top (ra), a value of the first is at B's bottom (rrb, pa, ra). The merged
// run lands behind the runs not yet merged, so run order is kept for the next pair.
export function naturalMerge(r) {
  const m = new S.M(r);
  const runs = () => { const out = []; let len = 1; for (let i = 1; i < m.A.length; i++) { if (m.A[i] > m.A[i - 1]) len++; else { out.push(len); len = 1; } } if (m.A.length) out.push(len); return out; };
  for (let R = runs(); R.length > 1; R = runs()) {
    for (let k = 0; k + 1 < R.length; k += 2) {
      let a = R[k], b = R[k + 1];
      m.op('pb', a);
      while (a || b) {
        const fromB = a && (!b || m.B[m.B.length - 1] < m.A[0]);
        if (fromB) { if (m.B.length > 1) m.op('rrb'); m.op('pa'); m.op('ra'); a--; } else { m.op('ra'); b--; }
      }
    }
    if (R.length % 2) m.op('ra', R[R.length - 1]);
  }
  return m;
}

// Exact disorder d: a random Lehmer code with d·n(n−1)/2 inversions, so the subject's metric is d.
export function exactDisorder(n, d, rnd) {
  const cap = [...Array(n).keys()].map(i => n - 1 - i), c = new Array(n).fill(0);
  let K = Math.round(d * n * (n - 1) / 2), open = [...Array(n).keys()].filter(i => cap[i] > 0);
  while (K > 0) { const j = (rnd() * open.length) | 0, i = open[j]; c[i]++; K--; if (c[i] === cap[i]) open.splice(j, 1); }
  const avail = [...Array(n).keys()]; return c.map(ci => avail.splice(ci, 1)[0]);
}
export function disorderInputs(n, d, count, seed) { const rnd = mulberry32(seed * 7907 + n * 13 + Math.round(d * 1000)); return Array.from({ length: count }, () => exactDisorder(n, d, rnd)); }

// Worst-case search: hill-climb on inputs, swapping two values and keeping swaps that do not lower
// the op count. Returns the worst input found and its count.
export function worstCase(fn, n, { tries = 400, restarts = 2, seed = 1 } = {}) {
  const rnd = mulberry32(seed * 104729 + n); let best = null, bestOps = -1;
  for (let s = 0; s < restarts; s++) {
    let p = shuf(n, rnd), cur = run(fn, p).n;
    for (let t = 0; t < tries; t++) {
      const i = (rnd() * n) | 0, j = (rnd() * n) | 0; if (i === j) continue;
      [p[i], p[j]] = [p[j], p[i]]; const v = run(fn, p).n;
      if (v >= cur) cur = v; else [p[i], p[j]] = [p[j], p[i]];
    }
    if (cur > bestOps) { bestOps = cur; best = p.slice(); }
  }
  return { ops: bestOps, input: best };
}

// Nearly sorted: the sorted order with k random transpositions.
export function swapInputs(n, k, count, seed) {
  const rnd = mulberry32(seed * 6151 + n * 31 + k);
  return Array.from({ length: count }, () => { const p = [...Array(n).keys()]; for (let t = 0; t < k; t++) { const i = (rnd() * n) | 0, j = (rnd() * n) | 0; [p[i], p[j]] = [p[j], p[i]]; } return p; });
}
