// The Divide family: Quick 2-Way with Restore Skip as a switch, and a four-ends quicksort whose
// ends, split, pivot and Finisher are all options, plus BFS leaves and a simplified DP Splits.
import { S } from './lib.mjs';

// Quick 2-Way, ported from measure-sim.js. skipWhole = Restore Skip's first case (no restore
// when the chunk is the whole stack), which the sim's version always does.
// pivot: median (Quick 2-Way) | msd (MSD Radix: split at the top bit of the range, a power of two).
export function quick2X(r, { skipWhole = true, pivot = 'median' } = {}) {
  const cut = (lo, k) => pivot === 'msd' ? lo + (1 << Math.floor(Math.log2(k - 1))) : lo + (k >> 1);
  const m = new S.M(r);
  const sortedTopA = k => { for (let i = 1; i < k; i++) if (m.A[i - 1] > m.A[i]) return false; return true; };
  function aToB(lo, hi) {
    const k = hi - lo; if (k <= 1) return;
    if (k === 2) { if (m.A[0] > m.A[1]) m.op('sa'); return; }
    if (sortedTopA(k)) return;
    const piv = cut(lo, k), need = piv - lo; let pushed = 0, rot = 0;
    for (let i = 0; i < k && pushed < need; i++) { if (m.A[0] < piv) { m.op('pb'); pushed++; } else { m.op('ra'); rot++; } }
    if (!skipWhole || m.A.length > k - pushed) m.op('rra', rot);
    aToB(piv, hi); bToA(lo, piv);
  }
  function bToA(lo, hi) {
    const k = hi - lo; if (k === 0) return; if (k === 1) { m.op('pa'); return; }
    if (k === 2) { if (m.B[0] < m.B[1]) m.op('sb'); m.op('pa', 2); return; }
    const piv = cut(lo, k), need = hi - piv; let pushed = 0, rot = 0;
    for (let i = 0; i < k && pushed < need; i++) { if (m.B[0] >= piv) { m.op('pa'); pushed++; } else { m.op('rb'); rot++; } }
    if (!skipWhole || m.B.length > k - pushed) m.op('rrb', rot);
    aToB(piv, hi); bToA(lo, piv);
  }
  aToB(0, r.length);
  return m;
}

// Four locations: the top and bottom of A and of B.
export const TA = 0, BA = 1, TB = 2, BB = 3;
const SEQ = [
  [[], ['ra'], ['pb'], ['pb', 'rb']],
  [['rra'], [], ['rra', 'pb'], ['rra', 'pb', 'rb']],
  [['pa'], ['pa', 'ra'], [], ['rb']],
  [['rrb', 'pa'], ['rrb', 'pa', 'ra'], ['rrb'], []],
];
const MC = SEQ.map(row => row.map(s => s.length));          // ops to move one value between ends
const DEST3 = [{ max: BA, mid: TB, min: BB }, { max: TA, mid: TB, min: BB }, { max: TA, mid: BA, min: BB }, { max: TA, mid: BA, min: TB }];
const DEST2 = [{ max: BA, min: TB }, { max: TA, min: TB }, { max: TA, min: BB }, { max: TA, min: TB }];

// BFS Leaf: the k ≤ 5 values of a leaf sit at one end; everything else on each stack is a fixed
// wall the search may not touch. Segments are ordered from the stack's top side.
const leafCache = new Map();
function bfsLeaf(loc, wA, wB, rel) {
  const key = `${loc}|${+wA}|${+wB}|${rel.join(',')}`;
  if (leafCache.has(key)) return leafCache.get(key);
  const seg = [[], [], [], []]; seg[loc] = rel.slice();
  if (!wA) { seg[TA] = seg[TA].concat(seg[BA]); seg[BA] = []; }
  if (!wB) { seg[TB] = seg[TB].concat(seg[BB]); seg[BB] = []; }
  const goal = rel.slice().sort((a, b) => a - b).join(',') + '||||||';
  const k = s => s.map(x => x.join(',')).join('||');
  const step = (st, o) => {
    const [aT, aB, bT, bB] = st.map(x => x.slice());
    const sw = s => { if (s.length < 2) return false; [s[0], s[1]] = [s[1], s[0]]; return true; };
    const fwd = (T, Bt, w) => { if (w) { if (!T.length) return false; Bt.push(T.shift()); return true; } if (T.length < 2) return false; T.push(T.shift()); return true; };
    const back = (T, Bt, w) => { if (w) { if (!Bt.length) return false; T.unshift(Bt.pop()); return true; } if (T.length < 2) return false; T.unshift(T.pop()); return true; };
    let ok;
    switch (o) {
      case 'sa': ok = sw(aT); break; case 'sb': ok = sw(bT); break; case 'ss': ok = sw(aT) && sw(bT); break;
      case 'pa': ok = bT.length > 0; if (ok) aT.unshift(bT.shift()); break;
      case 'pb': ok = aT.length > 0; if (ok) bT.unshift(aT.shift()); break;
      case 'ra': ok = fwd(aT, aB, wA); break; case 'rb': ok = fwd(bT, bB, wB); break; case 'rr': ok = fwd(aT, aB, wA) && fwd(bT, bB, wB); break;
      case 'rra': ok = back(aT, aB, wA); break; case 'rrb': ok = back(bT, bB, wB); break; case 'rrr': ok = back(aT, aB, wA) && back(bT, bB, wB); break;
    }
    return ok ? [aT, aB, bT, bB] : null;
  };
  const OPS = ['sa', 'sb', 'ss', 'pa', 'pb', 'ra', 'rb', 'rr', 'rra', 'rrb', 'rrr'];
  const prev = new Map([[k(seg), null]]); let fr = [seg], found = k(seg) === goal ? k(seg) : null;
  while (fr.length && !found) {
    const nx = [];
    for (const st of fr) {
      for (const o of OPS) {
        const s2 = step(st, o); if (!s2) continue; const k2 = k(s2);
        if (prev.has(k2)) continue; prev.set(k2, [k(st), o]); nx.push(s2);
        if (k2 === goal) { found = k2; break; }
      }
      if (found) break;
    }
    fr = nx;
  }
  const ops = []; for (let s = found; prev.get(s); s = prev.get(s)[0]) ops.push(prev.get(s)[1]);
  ops.reverse(); leafCache.set(key, ops);
  return ops;
}
// Expected BFS cost of a leaf of size s at loc, with walls on both stacks: the DP's base case.
const avgCache = new Map();
function avgLeaf(s, loc) {
  const key = s * 4 + loc; if (avgCache.has(key)) return avgCache.get(key);
  let sum = 0, cnt = 0; const p = [...Array(s).keys()];
  (function go(i) { if (i === s) { sum += bfsLeaf(loc, true, true, p).length; cnt++; return; } for (let j = i; j < s; j++) { [p[i], p[j]] = [p[j], p[i]]; go(i + 1); [p[i], p[j]] = [p[j], p[i]]; } })(0);
  avgCache.set(key, sum / cnt); return sum / cnt;
}

// DP Splits, simplified: choose part sizes and destinations per (size, end) to minimise the
// expected ops, from the per-value move costs and the BFS leaves' average costs. Unlike the
// reference build's DP it ignores rr merges and free reads of a chunk alone on its stack.
// Only the max part, which is sorted first, may go to the top of A: sorted output piles up
// there, and any other part parked there would be buried under it.
const dpCache = new Map();
export function dpPlan(N, leaf) {
  N = Math.max(N, 500);
  const key = `${N}|${leaf}`; if (dpCache.has(key)) return dpCache.get(key);
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
  const out = { plan: (s, l) => plan[s * 4 + l], cost: (s, l) => cost[s * 4 + l] };
  dpCache.set(key, out); return out;
}

// Four-end quicksort family.
//   parts: 2 (Four Ends with halves) | 3 (Four Ends + Thirds Split)
//   pivot: equal | leaf (Pivot by Leaf Count, aiming at full leaves of pivotLeaf values)
//   leaf: 1 (no Finisher: recurse down to single values) | k (BFS Leaf ≤ k)
//   dp: use DP Splits for sizes and destinations
export function fourEnds(r, { parts = 3, pivot = 'equal', leaf = 1, pivotLeaf = 5, dp = false } = {}) {
  const m = new S.M(r), n = r.length, plan = dp ? dpPlan(n, leaf) : null;
  const norm = (l, s) => (l === BA && m.A.length === s) ? TA : (l === BB && m.B.length === s) ? TB : l;
  const peek = l => l === TA ? m.A[0] : l === BA ? m.A[m.A.length - 1] : l === TB ? m.B[0] : m.B[m.B.length - 1];
  function solveLeaf(l, lo, s) {
    if (s === 1) { for (const o of SEQ[l][TA]) m.op(o); return; }
    const A = m.A, B = m.B;
    const vals = l === TA ? A.slice(0, s) : l === BA ? A.slice(A.length - s) : l === TB ? B.slice(0, s) : B.slice(B.length - s);
    const wA = A.length > (l < 2 ? s : 0), wB = B.length > (l >= 2 ? s : 0);
    for (const o of bfsLeaf(l, wA, wB, vals.map(v => v - lo))) m.op(o);
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
    for (let i = 0; i < s; i++) { const x = peek(l); for (const o of SEQ[l][x >= hiMid ? dest.max : x >= hiMin ? dest.mid : dest.min]) m.op(o); }
    go(dest.max, hiMid, sizes.max); go(dest.mid, hiMin, sizes.mid); go(dest.min, lo, sizes.min);
  }
  go(TA, 0, n);
  return m;
}
