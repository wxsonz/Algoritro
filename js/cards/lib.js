// Planning helpers shared by the cards. Ported from spec/sim so that the cards reproduce the
// sim's streams op for op (tests/reference.test.mjs checks the means).

// LIS by patience sorting with predecessor links. Returns the kept values.
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
// The longest LIS over all rotations of A.
export function circKeep(r) {
  let best = new Set();
  for (let k = 0; k < r.length; k++) { const s = lisKeep(r.slice(k).concat(r.slice(0, k))); if (s.size > best.size) best = s; }
  return best;
}
// The longest stretch of adjacent values already in ascending order.
export function runKeep(r) {
  let bs = 0, bl = r.length ? 1 : 0;
  for (let i = 1, s = 0; i < r.length; i++) { if (r[i] < r[i - 1]) s = i; if (i - s + 1 > bl) { bl = i - s + 1; bs = s; } }
  return new Set(r.slice(bs, bs + bl));
}

export const minIndex = A => { let p = 0; for (let i = 1; i < A.length; i++) if (A[i] < A[p]) p = i; return p; };
export const maxIndex = B => { let p = 0; for (let i = 1; i < B.length; i++) if (B[i] > B[p]) p = i; return p; };

// Slot of x in A, circularly ascending with its minimum at p: x goes above A[j], the smallest
// larger value, or the minimum when x is a new extreme.
export function slotA(A, p, x) {
  const ma = A.length; if (ma === 0) return 0;
  let lo = 0, hi = ma;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (A[(p + mid) % ma] > x) hi = mid; else lo = mid + 1; }
  return (p + lo) % ma;
}
// Target of x in B, circularly descending with its maximum at q: the largest smaller value, or
// the maximum when there is none.
export function targetB(B, q, x) {
  const mb = B.length; if (mb === 0) return 0;
  let lo = 0, hi = mb;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (B[(q + mid) % mb] < x) hi = mid; else lo = mid + 1; }
  return (q + lo) % mb;
}
// Slot of x in a circularly descending B by linear scan (Insert-into-B's own rule).
export function slotDesc(B, x) {
  const mb = B.length; if (mb < 2) return 0;
  for (let t = 0; t < mb; t++) { const p = B[(t - 1 + mb) % mb], s = B[t]; if (p > s ? (p > x && x > s) : (x < p || x > s)) return t; }
  return 0;
}

// A move is [cost, type, nA, nB]: type 0 rr-style, 1 rrr-style, 2 ra + rrb, 3 rra + rb.
// Two-Way Cost: each stack by its shorter direction, shared when the directions agree.
export function cost2(j, ma, i, mb) {
  const upA = j <= ma / 2, nA = upA ? j : ma - j, upB = i <= mb / 2, nB = upB ? i : mb - i;
  if (upA === upB) return [Math.max(nA, nB), upA ? 0 : 1, nA, nB];
  return [nA + nB, upA ? 2 : 3, nA, nB];
}
// Four-Way Cost: rr, rrr, ra + rrb and rra + rb, the cheapest (first in that order on ties).
export function cost4(j, ma, i, mb) {
  const fa = j, ba = (ma - j) % ma, fb = i, bb = (mb - i) % mb;
  const c = [[Math.max(fa, fb), 0, fa, fb], [Math.max(ba, bb), 1, ba, bb], [fa + bb, 2, fa, bb], [ba + fb, 3, ba, fb]];
  let best = c[0]; for (let k = 1; k < 4; k++) if (c[k][0] < best[0]) best = c[k];
  return best;
}
export const price = (cost, ia, ma, ib, mb) => (cost === 4 ? cost4 : cost2)(ia, Math.max(ma, 1), ib, Math.max(mb, 1));
// Perform a move with Double-Op Sharing: the shared part as rr / rrr.
export function exec(m, c) {
  const [, t, a, b] = c;
  if (t === 0) { const s = Math.min(a, b); m.op('rr', s); m.op('ra', a - s); m.op('rb', b - s); }
  else if (t === 1) { const s = Math.min(a, b); m.op('rrr', s); m.op('rra', a - s); m.op('rrb', b - s); }
  else if (t === 2) { m.op('ra', a); m.op('rrb', b); }
  else { m.op('rra', a); m.op('rb', b); }
}
// The same move with Double-Op Sharing switched off.
export function execNoShare(m, c) {
  const [, t, a, b] = c;
  m.op(t === 0 || t === 2 ? 'ra' : 'rra', a); m.op(t === 0 || t === 3 ? 'rb' : 'rrb', b);
}

// Pure versions of a move, for lookahead and beam search.
const rotL = (x, k) => (x.length < 2 || !(k %= x.length)) ? x.slice() : x.slice(k).concat(x.slice(0, k));
const rotR = (x, k) => (x.length < 2 || !(k %= x.length)) ? x.slice() : x.slice(x.length - k).concat(x.slice(0, x.length - k));
function rotate(A, B, c) {
  const [, t, a, b] = c;
  return [(t === 0 || t === 2) ? rotL(A, a) : rotR(A, a), (t === 0 || t === 3) ? rotL(B, b) : rotR(B, b)];
}
export function afterPa(A, B, c) { const [A2, B2] = rotate(A, B, c); return [[B2[0]].concat(A2), B2.slice(1)]; }
export function afterPb(A, B, c) { const [A2, B2] = rotate(A, B, c); return [A2.slice(1), [A2[0]].concat(B2)]; }

// Candidates are [move, index]. The cheapest, first by index on ties.
export const cheapest = cands => { let best = null; for (const c of cands) if (!best || c[0][0] < best[0][0]) best = c; return best; };
// Among the b cheapest moves, minimise this move plus the cheapest move after it.
export function lookahead(cands, b, next) {
  const top = cands.slice().sort((x, y) => x[0][0] - y[0][0] || x[1] - y[1]).slice(0, b);
  let best = null, bs = Infinity;
  for (const c of top) { const s = c[0][0] + next(c[0]); if (s < bs) { bs = s; best = c; } }
  return best;
}
// Words for a move, for the step's "why".
export function moveWords(c) {
  const [, t, a, b] = c;
  if (!a && !b) return 'no rotation';
  return t === 0 ? `rr-style (A ${a} up, B ${b} up)` : t === 1 ? `rrr-style (A ${a} down, B ${b} down)` : t === 2 ? `ra ${a} + rrb ${b}` : `rra ${a} + rb ${b}`;
}
