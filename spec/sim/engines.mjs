// Fast engines for the Insertion family and Turk, with every technique option the spec lists.
// Slots are found by binary search on the circularly sorted stack, so lookahead and beam search
// stay affordable. With default options they reproduce cards.mjs's ins() and the sim's turk()
// op for op; report.mjs checks that before measuring anything.
import { S, cost2, cost4, exec } from './lib.mjs';
import { lisKeep, circKeep } from './cards.mjs';

// Longest Run Anchor: the longest stretch of adjacent values already in ascending order.
export function runKeep(r) {
  let bs = 0, bl = r.length ? 1 : 0;
  for (let i = 1, s = 0; i < r.length; i++) { if (r[i] < r[i - 1]) s = i; if (i - s + 1 > bl) { bl = i - s + 1; bs = s; } }
  return new Set(r.slice(bs, bs + bl));
}
const minIndex = A => { let p = 0; for (let i = 1; i < A.length; i++) if (A[i] < A[p]) p = i; return p; };
const maxIndex = B => { let p = 0; for (let i = 1; i < B.length; i++) if (B[i] > B[p]) p = i; return p; };
// A circularly ascending with its minimum at p: x goes above A[j] (the smallest larger value,
// or the minimum when x is a new extreme).
export function slotA(A, p, x) {
  const ma = A.length; if (ma === 0) return 0;
  let lo = 0, hi = ma;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (A[(p + mid) % ma] > x) hi = mid; else lo = mid + 1; }
  return (p + lo) % ma;
}
// B circularly descending with its maximum at q: Turk's target for x is the largest smaller
// value, or the maximum when there is none.
export function targetB(B, q, x) {
  const mb = B.length; if (mb === 0) return 0;
  let lo = 0, hi = mb;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (B[(q + mid) % mb] < x) hi = mid; else lo = mid + 1; }
  return (q + lo) % mb;
}
const price = (cost, ia, ma, ib, mb) => (cost === 4 ? cost4 : cost2)(ia, Math.max(ma, 1), ib, Math.max(mb, 1));
// Double-Op Sharing off: the same move, with the shared rotations emitted separately.
function execNoShare(m, c) {
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
function afterPa(A, B, c) { const [A2, B2] = rotate(A, B, c); return [[B2[0]].concat(A2), B2.slice(1)]; }
function afterPb(A, B, c) { const [A2, B2] = rotate(A, B, c); return [A2.slice(1), [A2[0]].concat(B2)]; }

// Insertion return (B -> A): every candidate's price, cheapest first by index on ties.
function insCandidates(A, B, cost, only) {
  const ma = A.length, mb = B.length, p = ma ? minIndex(A) : 0, out = [];
  for (let i = 0; i < mb; i++) { if (only && !only(B[i])) continue; out.push([price(cost, slotA(A, p, B[i]), ma, i, mb), i]); }
  return out;
}
const cheapest = cands => { let best = null; for (const c of cands) if (!best || c[0][0] < best[0][0]) best = c; return best; };
// Lookahead: among the b cheapest moves, minimise this move plus the cheapest move after it.
function lookahead(cands, b, next) {
  const top = cands.slice().sort((x, y) => x[0][0] - y[0][0] || x[1] - y[1]).slice(0, b);
  let best = null, bs = Infinity;
  for (const c of top) { const s = c[0][0] + next(c[0]); if (s < bs) { bs = s; best = c; } }
  return best;
}

// The Insertion bench.
//   anchor: none | lis | circ | run        pick: top | cheapest       cost: 2 | 4
//   bands: 1 | 2 (rb Sink below q·n)       sharing: Double-Op Sharing  look: lookahead width (0 = off)
export function insX(r, { anchor = 'lis', pick = 'cheapest', cost = 4, bands = 1, q = 0.5, sharing = true, look = 0 } = {}) {
  const m = new S.M(r), n = r.length;
  const keep = anchor === 'none' ? new Set() : anchor === 'circ' ? circKeep(r) : anchor === 'run' ? runKeep(r) : lisKeep(r);
  passOne(m, r, keep, bands, q);
  const move = sharing ? c => exec(m, c) : c => execNoShare(m, c);
  while (m.B.length) {
    const A = m.A, B = m.B;
    if (pick === 'top') { m.bring('A', slotA(A, A.length ? minIndex(A) : 0, B[0]), 'ra', 'rra'); m.op('pa'); continue; }
    const cands = insCandidates(A, B, cost);
    const best = look && B.length > 1
      ? lookahead(cands, look, c => { const [A2, B2] = afterPa(A, B, c); const nx = cheapest(insCandidates(A2, B2, cost)); return nx ? nx[0][0] : 0; })
      : cheapest(cands);
    move(best[0]); m.op('pa');
  }
  m.bring('A', m.A.indexOf(0), 'ra', 'rra');
  return m;
}
// Pass 1 of the bench: ra past kept values, pb the rest, sinking values below q·n when bands = 2.
function passOne(m, r, keep, bands, q) {
  const n = r.length; let last = -1, sink = false;
  for (let i = 0; i < n; i++) if (!keep.has(r[i])) last = i;
  for (let j = 0; j <= last; j++) {
    const x = m.A[0];
    if (keep.has(x)) m.op(sink ? 'rr' : 'ra'); else { if (sink) m.op('rb'); m.op('pb'); }
    sink = bands === 2 && !keep.has(x) && x < q * n;
  }
  if (sink) m.op('rb');
}

// Beam over Orders on the Insertion bench: keep the W cheapest partial insertion orders, each
// expanded by its c cheapest next insertions, scored by ops so far.
export function beamIns(r, { W = 16, c = 3, cost = 4, bands = 2, q = 0.5 } = {}) {
  const m = new S.M(r);
  passOne(m, r, lisKeep(r), bands, q);
  let beam = [{ A: m.A.slice(), B: m.B.slice(), g: 0, prev: null, mv: null }];
  while (beam[0].B.length) {
    const kids = [];
    for (const s of beam) {
      const cands = insCandidates(s.A, s.B, cost).sort((x, y) => x[0][0] - y[0][0] || x[1] - y[1]).slice(0, c);
      for (const [mv] of cands) { const [A2, B2] = afterPa(s.A, s.B, mv); kids.push({ A: A2, B: B2, g: s.g + mv[0] + 1, prev: s, mv }); }
    }
    kids.sort((x, y) => x.g - y.g);
    beam = kids.slice(0, W);
  }
  const plan = []; for (let s = beam[0]; s.prev; s = s.prev) plan.push(s.mv);
  for (let i = plan.length - 1; i >= 0; i--) { exec(m, plan[i]); m.op('pa'); }
  m.bring('A', m.A.indexOf(0), 'ra', 'rra');
  return m;
}

// Turk. anchor: three (Keep Three) | lis | circ | run.  cost: 4 | 2.  sbSeed: sb after pb pb.
// sharing: Double-Op Sharing.  look: lookahead width (0 = off), i.e. the Lookahead Greedy card.
// commit: with lookahead, also play the cheapest follow-up move instead of re-planning first.
// window: Window Pick, only the w values nearest either end of A are candidates (0 = all).
export function turkX(r, { anchor = 'three', cost = 4, sbSeed = false, sharing = true, look = 0, commit = false, window = 0 } = {}) {
  const m = new S.M(r);
  const keep = anchor === 'lis' ? lisKeep(r) : anchor === 'circ' ? circKeep(r) : anchor === 'run' ? runKeep(r) : null;
  const pushable = keep ? x => !keep.has(x) : () => true;
  const move = sharing ? c => exec(m, c) : c => execNoShare(m, c);
  let left = keep ? r.filter(pushable).length : 0;
  if (!keep) { if (m.A.length > 3) m.op('pb'); if (m.A.length > 3) m.op('pb'); if (sbSeed && m.B.length === 2 && m.B[0] < m.B[1]) m.op('sb'); }
  const cands = (A, B) => {
    const ma = A.length, mb = B.length, q = mb ? maxIndex(B) : 0, out = [];
    for (let i = 0; i < ma; i++) if (pushable(A[i]) && (!window || i < window || i >= ma - window)) out.push([price(cost, i, ma, targetB(B, q, A[i]), mb), i]);
    return out;
  };
  while (keep ? left > 0 : m.A.length > 3) {
    const A = m.A, B = m.B, cs = cands(A, B);
    const best = look && cs.length > 1
      ? lookahead(cs, look, c => { const [A2, B2] = afterPb(A, B, c); const nx = cheapest(cands(A2, B2)); return nx ? nx[0][0] : 0; })
      : cheapest(cs);
    move(best[0]); m.op('pb'); left--;
    if (commit && look && (keep ? left > 0 : m.A.length > 3)) { move(cheapest(cands(m.A, m.B))[0]); m.op('pb'); left--; }
  }
  if (!keep && m.A.length === 3) S.three(m);
  while (m.B.length) { const A = m.A; m.bring('A', slotA(A, A.length ? minIndex(A) : 0, m.B[0]), 'ra', 'rra'); m.op('pa'); }
  m.bring('A', m.A.indexOf(0), 'ra', 'rra');
  return m;
}
