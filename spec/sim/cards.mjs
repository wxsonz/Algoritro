// Cards and technique variants that measure-sim.js does not have, written in the same style.
import { S, slotAsc, cost2, cost4, exec, disorder } from './lib.mjs';

// LIS by patience sorting with predecessor links (the sim's own method). Returns the kept values.
export function lisKeep(v) {
  const n = v.length, t = [], p = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = t.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (v[t[mid]] < v[i]) lo = mid + 1; else hi = mid; }
    if (lo > 0) p[i] = t[lo - 1]; t[lo] = i;
  }
  const keep = new Set(); let k = t.length ? t[t.length - 1] : -1;
  while (k >= 0) { keep.add(v[k]); k = p[k]; }
  return keep;
}
// Circular LIS Anchor: the longest LIS over all rotations.
export function circKeep(r) {
  let best = new Set();
  for (let k = 0; k < r.length; k++) { const s = lisKeep(r.slice(k).concat(r.slice(0, k))); if (s.size > best.size) best = s; }
  return best;
}

// The Insertion family on one bench.
//   anchor: 'none' (Simple Insertion) | 'lis' (LIS Anchor) | 'circ' (Circular LIS Anchor)
//   pick:   'top' (take B's top)      | 'cheapest' (Cheapest Pick)
//   cost:   2 (Two-Way) | 4 (Four-Way)       bands: 1 | 2 (rb Sink, merged into rr when it can)
// With anchor 'lis', pick 'cheapest', cost 4 it reproduces the sim's lisIns for each band count.
export function ins(r, { anchor = 'lis', pick = 'cheapest', cost = 4, bands = 1 } = {}) {
  const m = new S.M(r), n = r.length;
  const keep = anchor === 'none' ? new Set() : anchor === 'circ' ? circKeep(r) : lisKeep(r);
  let last = -1; for (let i = 0; i < n; i++) if (!keep.has(r[i])) last = i;
  let sink = false;
  for (let j = 0; j <= last; j++) {
    const x = m.A[0];
    if (keep.has(x)) m.op(sink ? 'rr' : 'ra'); else { if (sink) m.op('rb'); m.op('pb'); }
    sink = bands === 2 && !keep.has(x) && x < n / 2;
  }
  if (sink) m.op('rb');
  while (m.B.length) {
    const A = m.A, B = m.B, ma = A.length, mb = B.length;
    if (pick === 'top') { m.bring('A', slotAsc(A, B[0]), 'ra', 'rra'); m.op('pa'); continue; }
    let best = null;
    for (let i = 0; i < mb; i++) {
      const j = slotAsc(A, B[i]), c = cost === 4 ? cost4(j, ma, i, mb) : cost2(j, ma, i, mb);
      if (!best || c[0] < best[0]) best = c;
    }
    exec(m, best); m.op('pa');
  }
  m.bring('A', m.A.indexOf(0), 'ra', 'rra');
  return m;
}
export const simpleInsertion = r => ins(r, { anchor: 'none', pick: 'top' });
export const lisInsertion = r => ins(r, { cost: 2 });                          // bare: natives + default Two-Way
export const longLine = r => ins(r, { cost: 4, bands: 2 });                    // + Four-Way Cost + rb Sink

// Twin Extract: bring the closer of min and max to the top. A min goes pb; a max goes pb + rb.
// Return: pa the mins; the maxes are then on B's top in descending order, so pa them one by one
// and rotate that block to the bottom of A. With literal = true, the return the old spec text
// described (rrb + pa per max) is used instead; it never leaves A sorted.
export function twin(r, literal = false) {
  const m = new S.M(r); let srch = 0, steps = 0, j = 0;
  while (m.A.length > 3) {
    const A = m.A, L = A.length; let imn = 0, imx = 0;
    for (let i = 1; i < L; i++) { if (A[i] < A[imn]) imn = i; if (A[i] > A[imx]) imx = i; }
    const cmn = Math.min(imn, L - imn), cmx = Math.min(imx, L - imx);
    if (cmn <= cmx) { srch += cmn; m.bring('A', imn, 'ra', 'rra'); m.op('pb'); }
    else { srch += cmx; m.bring('A', imx, 'ra', 'rra'); m.op('pb'); m.op('rb'); j++; }
    steps++;
  }
  if (m.A.length === 3) S.three(m); else if (m.A.length === 2 && m.A[0] > m.A[1]) m.op('sa');
  const mins = m.B.length - j;
  for (let k = 0; k < mins; k++) m.op('pa');
  if (literal) { for (let k = 0; k < j; k++) { if (m.B.length > 1) m.op('rrb'); m.op('pa'); } }
  else {
    for (let k = 0; k < j; k++) m.op('pa');
    if (j) { if (j <= m.A.length - j) m.op('ra', j); else m.op('rra', m.A.length - j); }
  }
  m.search = steps ? srch / steps : 0;
  return m;
}
export function minExtractSearch(r) {
  const m = new S.M(r); let s = 0, c = 0;
  while (m.A.length > 3) { const L = m.A.length, i = m.A.indexOf(Math.min(...m.A)); s += Math.min(i, L - i); c++; m.bring('A', i, 'ra', 'rra'); m.op('pb'); }
  return c ? s / c : 0;
}

// Ternary LSD radix. 'spec': digit 0 -> pb rb, 1 -> pb, 2 -> ra; gather the 1s with pa, then
// the 0s with rrb + pa. 'best': per pass, the cheaper of the two top/bottom assignments, or the
// binary scheme when only two digits occur in that pass. No-op rotations are not emitted.
export function ternary(r, mode = 'spec') {
  const m = new S.M(r), n = r.length; let passes = 0; while (3 ** passes < n) passes++;
  const rot = o => { if (m.B.length > 1) m.op(o); };
  for (let p = 0; p < passes; p++) {
    const dig = x => Math.floor(x / 3 ** p) % 3, cnt = [0, 0, 0]; for (const x of m.A) cnt[dig(x)]++;
    if (mode === 'best' && cnt.filter(c => c > 0).length <= 2) {
      const hi = cnt[2] ? 2 : 1;
      for (let i = 0; i < n; i++) { if (dig(m.A[0]) === hi) m.op('ra'); else m.op('pb'); }
      while (m.B.length) m.op('pa');
      continue;
    }
    const bottom = mode === 'best' ? (cnt[0] <= cnt[1] ? 0 : 1) : 0, top = 1 - bottom;
    for (let i = 0; i < n; i++) { const d = dig(m.A[0]); if (d === 2) m.op('ra'); else if (d === top) m.op('pb'); else { m.op('pb'); rot('rb'); } }
    if (bottom === 0) { for (let k = 0; k < cnt[1]; k++) m.op('pa'); for (let k = 0; k < cnt[0]; k++) { rot('rrb'); m.op('pa'); } }
    else { for (let k = 0; k < cnt[1]; k++) { rot('rrb'); m.op('pa'); } for (let k = 0; k < cnt[0]; k++) m.op('pa'); }
  }
  return m;
}

// Retrieval for bucket cards: Max Retrieval, or Second-Max Lookahead on top of it.
function retrieve(m, second) {
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
  return m;
}
// Chunks with a sweep ('nearest' = Nearest-Member, 'oneway' = One-Way, 'ra' = blind ra only),
// the rb Sink band, and Max Retrieval or Second-Max. 'nearest' + max equals the sim's chunks.
// One-Way prices both directions honestly: an ra sweep pays only for the non-members it passes,
// because each pb moves the sweep forward; an rra sweep pays one rra for every value it pulls up,
// members included.
export function chunks(r, K, { sweep = 'nearest', second = false } = {}) {
  const m = new S.M(r), n = r.length, w = Math.ceil(n / K);
  for (let c = 0; c < K; c++) {
    const lo = c * w, hi = Math.min(n, lo + w), mem = x => x >= lo && x < hi; let left = hi - lo;
    const push = () => { const v = m.A[0]; m.op('pb'); left--; if (v < lo + w / 2 && m.B.length > 1) m.op('rb'); };
    if (sweep === 'nearest') {
      while (left > 0) {
        const A = m.A, f = A.findIndex(mem); let bk = -1;
        for (let i = A.length - 1; i >= 0; i--) if (mem(A[i])) { bk = i; break; }
        if (f <= A.length - bk) m.op('ra', f); else m.op('rra', A.length - bk);
        push();
      }
    } else {
      const A = m.A; let k = 0, last = -1, firstBelowTop = -1;
      for (let i = 0; i < A.length; i++) if (mem(A[i])) { k++; last = i; if (i > 0 && firstBelowTop < 0) firstBelowTop = i; }
      const raCost = last + 1 - k, rraCost = firstBelowTop < 0 ? 0 : A.length - firstBelowTop;
      const fwd = sweep === 'ra' || raCost <= rraCost;
      while (left > 0) { if (mem(m.A[0])) push(); else m.op(fwd ? 'ra' : 'rra'); }
    }
  }
  return retrieve(m, second);
}
export function butterfly(r, w, { second = false } = {}) {
  const m = new S.M(r); let i = 0;
  while (m.A.length) { const x = m.A[0]; if (x <= i) { m.op('pb'); m.op('rb'); i++; } else if (x <= i + w) { m.op('pb'); i++; } else m.op('ra'); }
  return retrieve(m, second);
}
// Params as functions of n. The sim's own values are steps: K = 5 / 11, w = 15 / 30.
export const K_STEP = n => (n <= 100 ? 5 : 11), W_STEP = n => (n <= 100 ? 15 : 30);
export const K_SQRT = n => Math.max(1, Math.round(Math.sqrt(n) / 2));        // 5 at 100, 11 at 500
export const K_TUNED = n => Math.max(1, Math.round(0.4 * Math.sqrt(n)));     // 4 at 100, 9 at 500
export const W_SQRT = n => Math.max(1, Math.round(1.4 * Math.sqrt(n)));      // 14 at 100, 31 at 500

// Adaptive Selector with the subject's thresholds.
export function adaptive(simple, medium, complex) {
  return r => { const d = disorder(r); return (d < 0.2 ? simple : d < 0.5 ? medium : complex)(r); };
}
