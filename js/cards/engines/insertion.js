// The Insertion family's engines, ported from spec/sim/engines.mjs and cards.mjs. With the same
// options they emit the sim's streams op for op; the phases, reasons and overlays are additions.
import { lisKeep, minIndex, maxIndex, slotA, targetB, slotDesc, price, exec, execNoShare, afterPa, afterPb, cheapest, lookahead, moveWords } from '../lib.js';

// Pass 1 of the bench: ra past kept values, pb the rest, sinking values below q·n when bands = 2.
function passOne(m, r, keep, bands, q) {
  const n = r.length; let last = -1, sink = false;
  for (let i = 0; i < n; i++) if (!keep.has(r[i])) last = i;
  m.phase('push').overlay('keep', keep);
  for (let j = 0; j <= last; j++) {
    const x = m.a[0];
    if (keep.has(x)) m.why(sink ? `${x} is kept; the pending rb merges into rr` : `${x} is kept: rotate past it`).op(sink ? 'rr' : 'ra');
    else { if (sink) m.why('sink the previous value to B\'s bottom').op('rb'); m.why(keep.size ? `${x} is not kept: push it` : `push ${x}`).op('pb'); }
    sink = bands === 2 && !keep.has(x) && x < q * n;
  }
  if (sink) m.why('sink the last pushed value').op('rb');
}

// The Insertion bench: Simple Insertion and LIS Insertion.
//   keep: the anchor's kept set     pick: top | cheapest     cost: 2 | 4
//   bands: 1 | 2 (rb Sink below q·n)    sharing: Double-Op Sharing    look: lookahead width (0 = off)
export function insertion(m, { keep = new Set(), pick = 'cheapest', cost = 2, bands = 1, q = 0.5, sharing = true, look = 0 } = {}) {
  const r = m.a.slice();
  passOne(m, r, keep, bands, q);
  const move = sharing ? c => exec(m, c) : c => execNoShare(m, c);
  m.phase('insert');
  while (m.b.length) {
    const A = m.a, B = m.b;
    if (pick === 'top') {
      const j = slotA(A, A.length ? minIndex(A) : 0, B[0]);
      m.focus({ mover: B[0], target: A[j] }).why(`take B's top (${B[0]}) and rotate A to its slot`).bring('a', j).op('pa');
      continue;
    }
    const cands = insCandidates(A, B, cost);
    const best = look && B.length > 1
      ? lookahead(cands, look, c => { const [A2, B2] = afterPa(A, B, c); const nx = cheapest(insCandidates(A2, B2, cost)); return nx ? nx[0][0] : 0; })
      : cheapest(cands);
    const x = B[best[1]];
    m.focus({ mover: x }).why(`cheapest of ${B.length}: ${x}, ${best[0][0]} rotations, ${moveWords(best[0])}`);
    move(best[0]); m.op('pa');
  }
  m.focus(null).phase('align').why('rotate the minimum to the top').bring('a', m.a.indexOf(0));
}
function insCandidates(A, B, cost) {
  const ma = A.length, mb = B.length, p = ma ? minIndex(A) : 0, out = [];
  for (let i = 0; i < mb; i++) out.push([price(cost, slotA(A, p, B[i]), ma, i, mb), i]);
  return out;
}

// Beam over Orders: keep the W cheapest partial insertion orders, each expanded by its c
// cheapest next insertions, scored by ops so far.
export function beamInsertion(m, { keep, cost = 4, bands = 2, q = 0.5, W = 16, c = 3 } = {}) {
  const r = m.a.slice();
  passOne(m, r, keep, bands, q);
  m.phase('plan');
  let beam = [{ A: m.a.slice(), B: m.b.slice(), g: 0, prev: null, mv: null }];
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
  m.phase('insert');
  for (let i = plan.length - 1; i >= 0; i--) { m.why(`beam plan (W = ${W}): ${moveWords(plan[i])}`); exec(m, plan[i]); m.op('pa'); }
  m.phase('align').why('rotate the minimum to the top').bring('a', m.a.indexOf(0));
}

// Turk and its relatives: push into B by cheapest move, finish the last values in A, return.
//   keep: kept set (an anchor) or null for Keep Three (stop at `rest` values and call finish)
//   cost: 2 | 4    sbSeed: sb after pb pb    sharing    look / commit: lookahead    window: Window Pick
export function turk(m, { keep = null, rest = 3, finish, cost = 4, sbSeed = false, sharing = true, look = 0, commit = false, window = 0 } = {}) {
  const r = m.a.slice();
  const pushable = keep ? x => !keep.has(x) : () => true;
  const move = sharing ? c => exec(m, c) : c => execNoShare(m, c);
  let left = keep ? r.filter(pushable).length : 0;
  m.phase('seed');
  if (keep) m.overlay('keep', keep);
  else { m.why('seed B with two values'); if (m.a.length > rest) m.op('pb'); if (m.a.length > rest) m.op('pb'); if (sbSeed && m.b.length === 2 && m.b[0] < m.b[1]) m.why('sb Seed: order the two seeds').op('sb'); }
  const cands = (A, B) => {
    const ma = A.length, mb = B.length, q = mb ? maxIndex(B) : 0, out = [];
    for (let i = 0; i < ma; i++) if (pushable(A[i]) && (!window || i < window || i >= ma - window)) out.push([price(cost, i, ma, targetB(B, q, A[i]), mb), i]);
    return out;
  };
  m.phase('push');
  const more = () => keep ? left > 0 : m.a.length > rest;
  while (more()) {
    const A = m.a, B = m.b, cs = cands(A, B);
    const best = look && cs.length > 1
      ? lookahead(cs, look, c => { const [A2, B2] = afterPb(A, B, c); const nx = cheapest(cands(A2, B2)); return nx ? nx[0][0] : 0; })
      : cheapest(cs);
    const x = A[best[1]], t = B.length ? B[targetB(B, maxIndex(B), x)] : null;
    m.focus({ mover: x, target: t }).why(`cheapest of ${cs.length}: ${x}${t == null ? '' : ` onto ${t}`}, ${best[0][0]} rotations, ${moveWords(best[0])}`);
    move(best[0]); m.op('pb'); left--;
    if (commit && look && more()) { const c2 = cheapest(cands(m.a, m.b)); m.why('lookahead: commit to the follow-up move'); move(c2[0]); m.op('pb'); left--; }
  }
  m.focus(null);
  if (!keep) { m.phase('finish'); finish(m); }
  m.phase('return');
  while (m.b.length) {
    const A = m.a, j = slotA(A, A.length ? minIndex(A) : 0, m.b[0]);
    m.focus({ mover: m.b[0], target: A[j] }).why(`return ${m.b[0]} to its slot in A`).bring('a', j).op('pa');
  }
  m.focus(null).phase('align').why('rotate the minimum to the top').bring('a', m.a.indexOf(0));
}

// Insert-into-B with its top pick: take A's top, rotate B to its slot, pb. Kept values (a
// mirrored anchor) are rotated past and stay in A.
export function intoB(m, { keep = new Set() } = {}) {
  const r = m.a.slice(); let left = r.filter(x => !keep.has(x)).length;
  m.phase('insert'); if (keep.size) m.overlay('keep', keep);
  while (left > 0) {
    const x = m.a[0];
    if (keep.has(x)) { m.why(`${x} is kept: rotate past it`).op('ra'); continue; }
    const j = slotDesc(m.b, x);
    m.focus({ mover: x, target: m.b[j] }).why(`rotate B so ${x} lands in descending order`).bring('b', j).op('pb'); left--;
  }
  m.focus(null).phase('return');
  if (!keep.size) {
    m.why('bring B\'s max to the top').bring('b', m.b.indexOf(Math.max(...m.b)));
    m.why('B is sorted descending: pa everything'); while (m.b.length) m.op('pa');
    return;
  }
  while (m.b.length) {
    const A = m.a, j = slotA(A, A.length ? minIndex(A) : 0, m.b[0]);
    m.focus({ mover: m.b[0], target: A[j] }).why(`return ${m.b[0]} to its slot among the kept values`).bring('a', j).op('pa');
  }
  m.focus(null).phase('align').why('rotate the minimum to the top').bring('a', m.a.indexOf(0));
}

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
