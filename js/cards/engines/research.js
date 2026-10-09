// Research cards the sim did not build: Tape Merge and Beam Sorter. Designed for the explorer;
// their numbers are measured by tools/meta.mjs and recorded in the spec as "exp" (explorer).
import { TA, bfsLeaf, compress } from '../leaf.js';
import { lisKeep, minIndex, slotA, price, afterPa, exec, moveWords } from '../lib.js';

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

// Beam Sorter: a whole-plan beam over insertion orders on the Insertion bench (LIS kept, rb Sink
// in pass 1), scored by ops so far plus a heuristic for the rest: the cheapest insertion cost of
// every value still in B, times a weight h. With h = 0 it is Beam over Orders with a wider beam.
export function beamSorter(m, { W = 64, c = 4, h = 0.25, cost = 4, q = 0.5 } = {}) {
  const r = m.a.slice(), n = r.length, keep = lisKeep(r);
  let last = -1, sink = false;
  for (let i = 0; i < n; i++) if (!keep.has(r[i])) last = i;
  m.phase('push').overlay('keep', keep);
  for (let j = 0; j <= last; j++) {
    const x = m.a[0];
    if (keep.has(x)) m.why(`${x} is kept`).op(sink ? 'rr' : 'ra'); else { if (sink) m.op('rb'); m.why(`push ${x}`).op('pb'); }
    sink = !keep.has(x) && x < q * n;
  }
  if (sink) m.op('rb');
  m.phase('plan').overlay(null);
  const cands = (A, B) => { const ma = A.length, mb = B.length, p = ma ? minIndex(A) : 0, out = []; for (let i = 0; i < mb; i++) out.push(price(cost, slotA(A, p, B[i]), ma, i, mb)); return out; };
  const est = (A, B) => { if (!h || !B.length) return 0; let s = 0; for (const mv of cands(A, B)) s += mv[0]; return h * s / B.length * Math.sqrt(B.length); };
  let beam = [{ A: m.a.slice(), B: m.b.slice(), g: 0, f: 0, prev: null, mv: null }];
  while (beam[0].B.length) {
    const kids = [], seen = new Set();
    for (const s of beam) {
      const cs = cands(s.A, s.B).map((mv, i) => [mv, i]).sort((x, y) => x[0][0] - y[0][0] || x[1] - y[1]).slice(0, c);
      for (const [mv] of cs) {
        const [A2, B2] = afterPa(s.A, s.B, mv), key = A2.join(',') + '|' + B2.join(',');
        if (seen.has(key)) continue; seen.add(key);
        const g = s.g + mv[0] + 1;
        kids.push({ A: A2, B: B2, g, f: g + est(A2, B2), prev: s, mv });
      }
    }
    kids.sort((x, y) => x.f - y.f || x.g - y.g);
    beam = kids.slice(0, W);
  }
  const align = A => { const i = A.indexOf(0); return Math.min(i, A.length - i); };
  let bestEnd = beam[0]; for (const s of beam) if (s.g + align(s.A) < bestEnd.g + align(bestEnd.A)) bestEnd = s;
  const plan = []; for (let s = bestEnd; s.prev; s = s.prev) plan.push(s.mv);
  m.phase('insert');
  for (let i = plan.length - 1; i >= 0; i--) { m.why(`beam plan: ${moveWords(plan[i])}`); exec(m, plan[i]); m.op('pa'); }
  m.phase('align').why('rotate the minimum to the top').bring('a', m.a.indexOf(0));
}
