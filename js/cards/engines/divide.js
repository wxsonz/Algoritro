// The Divide family's engines, ported from spec/sim/divide.mjs and more.mjs.
import { TA, BA, TB, BB, SEQ, MC, LOC, bfsLeaf, avgLeaf, compress } from '../leaf.js';

// Quick 2-Way. skipWhole: no restore when the chunk is the whole stack (part of the bare card).
// pivot: median | msd (MSD Radix: cut at the top bit of the range, a power of two).
export function quick2(m, { skipWhole = true, pivot = 'median' } = {}) {
  const cut = (lo, k) => pivot === 'msd' ? lo + (1 << Math.floor(Math.log2(k - 1))) : lo + (k >> 1);
  const sortedTopA = k => { for (let i = 1; i < k; i++) if (m.a[i - 1] > m.a[i]) return false; return true; };
  function aToB(lo, hi) {
    const k = hi - lo; if (k <= 1) return;
    m.overlay('range', [lo, hi]);
    if (k === 2) { if (m.a[0] > m.a[1]) m.phase('leaf').why('a leaf of 2 out of order').op('sa'); return; }
    if (sortedTopA(k)) return;
    const piv = cut(lo, k), need = piv - lo; let pushed = 0, rot = 0;
    m.phase(`A [${lo}, ${hi})`);
    for (let i = 0; i < k && pushed < need; i++) { if (m.a[0] < piv) { m.why(`${m.a[0]} < pivot ${piv}: push to B`).op('pb'); pushed++; } else { m.why(`${m.a[0]} ≥ pivot ${piv}: rotate past`).op('ra'); rot++; } }
    if (!skipWhole || m.a.length > k - pushed) m.why('restore the rotations').op('rra', rot);
    aToB(piv, hi); bToA(lo, piv);
  }
  function bToA(lo, hi) {
    const k = hi - lo; if (k === 0) return;
    m.overlay('range', [lo, hi]);
    if (k === 1) { m.phase('leaf').why('a single value: back to A').op('pa'); return; }
    if (k === 2) { m.phase('leaf'); if (m.b[0] < m.b[1]) m.why('a leaf of 2 out of order').op('sb'); m.why('back to A').op('pa', 2); return; }
    const piv = cut(lo, k), need = hi - piv; let pushed = 0, rot = 0;
    m.phase(`B [${lo}, ${hi})`);
    for (let i = 0; i < k && pushed < need; i++) { if (m.b[0] >= piv) { m.why(`${m.b[0]} ≥ pivot ${piv}: push to A`).op('pa'); pushed++; } else { m.why(`${m.b[0]} < pivot ${piv}: rotate past`).op('rb'); rot++; } }
    if (!skipWhole || m.b.length > k - pushed) m.why('restore the rotations').op('rrb', rot);
    aToB(piv, hi); bToA(lo, piv);
  }
  aToB(0, m.a.length);
}

const DEST3 = [{ max: BA, mid: TB, min: BB }, { max: TA, mid: TB, min: BB }, { max: TA, mid: BA, min: BB }, { max: TA, mid: BA, min: TB }];
const DEST2 = [{ max: BA, min: TB }, { max: TA, min: TB }, { max: TA, min: BB }, { max: TA, min: TB }];

// DP Splits, simplified: part sizes and destinations per (size, end) that minimise the expected
// ops, from the per-value move costs and the BFS leaves' average costs. It ignores rr merges and
// free reads of a chunk alone on its stack. Only the max part may go to the top of A.
// A plan for size s never depends on N, so tools/build-data.mjs ships the tables for s ≤ 1000
// (data/dp-plans.json); useDpTables() installs them, and anything larger is computed here.
const dpCache = new Map();
export function useDpTables(json) {
  if (!json) return;
  for (const [leaf, t] of Object.entries(json.plans)) {
    const N = json.N, plan = new Array((N + 1) * 4), cost = Float64Array.from(t.cost);
    for (let i = 0; i < t.plan.length; i++) { const p = t.plan[i]; if (p) plan[i] = { sizes: { max: p[0], mid: p[1], min: p[2] }, dest: { max: p[3], mid: p[4], min: p[5] } }; }
    dpCache.set(`${N}|${leaf}`, { N, plan: (s, l) => plan[s * 4 + l], cost: (s, l) => cost[s * 4 + l] });
  }
}
export function dpPlan(N, leaf) {
  N = Math.max(N, 1);
  for (const [k, v] of dpCache) if (+k.split('|')[1] === leaf && v.N >= N) return v;
  const key = `${N}|${leaf}`;
  const cost = new Float64Array((N + 1) * 4), plan = new Array((N + 1) * 4);
  for (let s = 1; s <= Math.min(leaf, N); s++) for (let l = 0; l < 4; l++) cost[s * 4 + l] = avgLeaf(s, l);
  const perms = l => {
    const o = [0, 1, 2, 3].filter(x => x !== l);
    return [[o[0], o[1], o[2]], [o[0], o[2], o[1]], [o[1], o[0], o[2]], [o[1], o[2], o[0]], [o[2], o[0], o[1]], [o[2], o[1], o[0]]]
      .filter(([, dm, dn]) => dm !== TA && dn !== TA);
  };
  for (let s = leaf + 1; s <= N; s++) for (let l = 0; l < 4; l++) {
    let best = Infinity, bp = null;
    for (const [dx, dm, dn] of perms(l)) {
      const cx = MC[l][dx], cm = MC[l][dm], cn = MC[l][dn];
      for (let a = 0; a < s; a++) {
        const fa = a * cx + cost[a * 4 + dx];
        for (let b = 0; a + b <= s; b++) {
          const c = s - a - b; if (c >= s || b >= s) continue;
          const t = fa + b * cm + cost[b * 4 + dm] + c * cn + cost[c * 4 + dn];
          if (t < best) { best = t; bp = { sizes: { max: a, mid: b, min: c }, dest: { max: dx, mid: dm, min: dn } }; }
        }
      }
    }
    cost[s * 4 + l] = best; plan[s * 4 + l] = bp;
  }
  const out = { N, plan: (s, l) => plan[s * 4 + l], cost: (s, l) => cost[s * 4 + l], raw: { plan, cost } };
  dpCache.set(key, out); return out;
}

// Four-end quicksort.
//   parts: 2 (Four Ends with halves) | 3 (Thirds Split)    pivot: equal | leaf (Pivot by Leaf Count)
//   leaf: 1 (no Finisher) | k (BFS Leaf ≤ k)    dp: DP Splits for sizes and destinations
// The sim plans DP Splits once for n = 500 and reuses it below that; dpN keeps that behaviour.
export function fourEnds(m, { parts = 3, pivot = 'equal', leaf = 1, pivotLeaf = 5, dp = false, dpN = 500 } = {}) {
  const n = m.a.length, plan = dp ? dpPlan(Math.max(n, dpN), leaf) : null;
  const norm = (l, s) => (l === BA && m.a.length === s) ? TA : (l === BB && m.b.length === s) ? TB : l;
  const peek = l => l === TA ? m.a[0] : l === BA ? m.a[m.a.length - 1] : l === TB ? m.b[0] : m.b[m.b.length - 1];
  function solveLeaf(l, lo, s) {
    m.phase('leaf').overlay('partition', { loc: l, lo, hi: lo + s });
    if (s === 1) { m.why(`move the single value ${lo} from the ${LOC[l]} to the top of A`); for (const o of SEQ[l][TA]) m.op(o); return; }
    const A = m.a, B = m.b;
    const vals = l === TA ? A.slice(0, s) : l === BA ? A.slice(A.length - s) : l === TB ? B.slice(0, s) : B.slice(B.length - s);
    const wA = A.length > (l < 2 ? s : 0), wB = B.length > (l >= 2 ? s : 0);
    m.why(`BFS Leaf: a shortest stream for these ${s} values, walls untouched`);
    for (const o of bfsLeaf(l, wA, wB, compress(vals))) m.op(o);
  }
  function sizesFor(s, l) {
    const pl = pivotLeaf;
    if (pivot === 'leaf' && s > pl) {
      const L = Math.ceil(s / pl);
      if (parts === 2 || L === 2) { const mx = pl * Math.ceil(L / 2); return [{ min: s - mx, mid: 0, max: mx }, DEST2[l]]; }
      const base = Math.floor(L / 3), rem = L % 3, mx = pl * (base + (rem >= 1 ? 1 : 0)), md = pl * (base + (rem >= 2 ? 1 : 0));
      return [{ min: s - mx - md, mid: md, max: mx }, DEST3[l]];
    }
    if (parts === 2) { const mn = s >> 1; return [{ min: mn, mid: 0, max: s - mn }, DEST2[l]]; }
    const t = Math.floor(s / 3);
    if (t === 0) return [{ min: s >> 1, mid: 0, max: s - (s >> 1) }, DEST3[l]];
    return [{ min: t, mid: t, max: s - 2 * t }, DEST3[l]];
  }
  function go(l, lo, s) {
    if (s <= 0) return;
    l = norm(l, s);
    if (s <= leaf) return solveLeaf(l, lo, s);
    let sizes, dest;
    if (plan) ({ sizes, dest } = plan.plan(s, l)); else [sizes, dest] = sizesFor(s, l);
    const hiMin = lo + sizes.min, hiMid = hiMin + sizes.mid;
    m.phase(`split ${s} at the ${LOC[l]}`).overlay('partition', { loc: l, lo, hi: lo + s, cuts: [hiMin, hiMid] });
    for (let i = 0; i < s; i++) {
      const x = peek(l), part = x >= hiMid ? 'max' : x >= hiMin ? 'mid' : 'min';
      m.why(`${x} is in the ${part} part: to the ${LOC[dest[part]]}`);
      for (const o of SEQ[l][dest[part]]) m.op(o);
    }
    go(dest.max, hiMid, sizes.max); go(dest.mid, hiMin, sizes.mid); go(dest.min, lo, sizes.min);
  }
  go(TA, 0, n);
}

// Natural Merge: merge neighbouring ascending runs of A, pass after pass. The first run of each
// pair goes to B, then both merge smallest first onto A's bottom.
export function naturalMerge(m) {
  const runs = () => { const out = []; let len = 1; for (let i = 1; i < m.a.length; i++) { if (m.a[i] > m.a[i - 1]) len++; else { out.push(len); len = 1; } } if (m.a.length) out.push(len); return out; };
  let pass = 0;
  for (let R = runs(); R.length > 1; R = runs()) {
    m.phase(`pass ${++pass}: ${R.length} runs`);
    for (let k = 0; k + 1 < R.length; k += 2) {
      let a = R[k], b = R[k + 1];
      m.why(`move the first run (${a} values) to B`).op('pb', a);
      while (a || b) {
        const fromB = a && (!b || m.b[m.b.length - 1] < m.a[0]);
        if (fromB) { m.why('the smaller head is at B\'s bottom'); if (m.b.length > 1) m.op('rrb'); m.op('pa'); m.op('ra'); a--; }
        else { m.why('the smaller head is on A\'s top').op('ra'); b--; }
      }
    }
    if (R.length % 2) m.why('carry the odd run to the back').op('ra', R[R.length - 1]);
  }
}

// Tape Merge, balanced two-way, on the stack ends. Every pass starts with all runs ascending on
// A's top. Distribute: runs alternately go to A's bottom (ra) and B's top (pb), so a run at A's
// bottom has its largest value lowest and a run on B's top has its largest value on top. Merge:
// take the larger of A's bottom (rra) and B's top (pa) onto A's top, so each pair becomes one
// ascending run on A's top. A pass costs about 2n ops; there are ⌈log₂ runs⌉ passes.
// leaf: with a Finisher, the first runs are blocks of `leaf` values sorted by BFS Leaf.
export function tapeMerge(m, { leaf = 0 } = {}) {
  const runsOnTop = () => { const out = []; let len = 1; for (let i = 1; i < m.a.length; i++) { if (m.a[i] > m.a[i - 1]) len++; else { out.push(len); len = 1; } } if (m.a.length) out.push(len); return out; };
  let R = leaf > 1 ? blocks(m.a.length, leaf) : runsOnTop(), pass = 0;
  if (leaf > 1 && R.length === 1 && m.a.length > 1) {
    m.phase('leaf').why(`Finisher: the whole input is one block of ${m.a.length}`);
    for (const o of bfsLeaf(TA, false, false, compress(m.a))) m.op(o);
    return;
  }
  while (R.length > 1) {
    pass++;
    m.phase(`pass ${pass}: distribute ${R.length} runs`);
    const xs = [], ys = [];
    R.forEach((len, i) => {
      if (pass === 1 && leaf > 1 && len > 1) {
        const vals = m.a.slice(0, len);
        m.why(`Finisher: sort this block of ${len} on A's top`);
        for (const o of bfsLeaf(TA, m.a.length > len, m.b.length > 0, compress(vals))) m.op(o);
      }
      if (i % 2 === 0) { m.why(`run ${i + 1} (${len}) to A's bottom`).op('ra', len); xs.push(len); }
      else { m.why(`run ${i + 1} (${len}) to B's top`).op('pb', len); ys.push(len); }
    });
    m.phase(`pass ${pass}: merge`);
    // The lowest run of A pairs with the top run of B.
    for (let p = 0; p < xs.length; p++) {
      let lx = xs[xs.length - 1 - p], ly = ys.length - 1 - p >= 0 ? ys[ys.length - 1 - p] : 0;
      while (lx || ly) {
        const fromA = lx && (!ly || m.a[m.a.length - 1] > m.b[0]);
        if (fromA) { m.why(`A's bottom (${m.a[m.a.length - 1]}) is the larger head`).op('rra'); lx--; }
        else { m.why(`B's top (${m.b[0]}) is the larger head`).op('pa'); ly--; }
      }
    }
    R = runsOnTop();
  }
}
function blocks(n, k) { const out = []; for (let i = 0; i < n; i += k) out.push(Math.min(k, n - i)); return out; }
