// Shared helpers for the reference simulator. Loads ../measure-sim.js without its runner loop,
// logs every op, and adds a seeded RNG, an independent replay, post passes and statistics.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SIM = fileURLToPath(new URL('../measure-sim.js', import.meta.url));
const src = readFileSync(SIM, 'utf8');
const cut = src.indexOf('var algos=');
if (cut < 0) throw new Error('runner not found in measure-sim.js');
// quick2 performs 'sb' inside its own op wrapper; log it too so its streams replay.
const body = src.slice(0, cut).replace('this.n++;return}', "this.n++;(this.log||(this.log=[])).push('sb');return}");
if (body === src.slice(0, cut)) throw new Error('quick2 sb patch failed');
export const S = new Function(body +
  '\nreturn {M,three,minext,radix,bubble,insB,chunks,butterfly,cost4,doMove,turk,quick2,lisIns};')();

// measure-sim.js's M has no sb or ss (only quick2 patches in sb). Add both, and log every op.
const origOp = S.M.prototype.op;
S.M.prototype.op = function (o, k) {
  k = k === undefined ? 1 : k;
  for (let i = 0; i < k; i++) {
    (this.log || (this.log = [])).push(o);
    if (o === 'sb' || o === 'ss') {
      const B = this.B; if (B.length > 1) { const t = B[0]; B[0] = B[1]; B[1] = t; }
      if (o === 'ss') origOp.call(this, 'sa', 1); else this.n++;
    } else origOp.call(this, o, 1);
  }
};

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuf(n, rnd) {
  const p = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
  return p;
}
// The same (n, count, seed) always gives the same uniform random permutations of ranks 0..n-1.
export function inputs(n, count, seed) {
  const rnd = mulberry32(seed * 1000003 + n);
  return Array.from({ length: count }, () => shuf(n, rnd));
}

// Independent replay: shares no code with M. A must end ascending and B empty.
export function replay(input, ops) {
  const a = input.slice(), b = [];
  const sw = s => { if (s.length > 1) { const t = s[0]; s[0] = s[1]; s[1] = t; } };
  const r = s => { if (s.length > 1) s.push(s.shift()); };
  const rr = s => { if (s.length > 1) s.unshift(s.pop()); };
  for (const o of ops) {
    switch (o) {
      case 'sa': sw(a); break; case 'sb': sw(b); break; case 'ss': sw(a); sw(b); break;
      case 'pa': if (b.length) a.unshift(b.shift()); break;
      case 'pb': if (a.length) b.unshift(a.shift()); break;
      case 'ra': r(a); break; case 'rb': r(b); break; case 'rr': r(a); r(b); break;
      case 'rra': rr(a); break; case 'rrb': rr(b); break; case 'rrr': rr(a); rr(b); break;
      default: throw new Error('unknown op ' + o);
    }
  }
  return b.length === 0 && a.length === input.length && a.every((x, i) => i === 0 || a[i - 1] < x);
}

// Run a card (r -> M) and check it with M.ok() and with the independent replay.
export function run(fn, r) {
  const m = fn(r);
  if (!m.ok()) throw new Error('M.ok failed');
  const log = m.log || [];
  if (log.length !== m.n) throw new Error(`log ${log.length} != n ${m.n}`);
  if (!replay(r, log)) throw new Error('independent replay failed');
  return m;
}
export const ops = (fn, rs) => rs.map(r => run(fn, r).n);

const INV = { ra: 'rra', rra: 'ra', rb: 'rrb', rrb: 'rb', rr: 'rrr', rrr: 'rr', pa: 'pb', pb: 'pa', sa: 'sa', sb: 'sb', ss: 'ss' };
const FUSE = { 'ra|rb': 'rr', 'rb|ra': 'rr', 'rra|rrb': 'rrr', 'rrb|rra': 'rrr', 'sa|sb': 'ss', 'sb|sa': 'ss' };
// Peephole Cancel: stack-based, so cascades cancel. Valid on streams without no-op pushes.
export function cancel(ops) { const out = []; for (const o of ops) { if (out.length && INV[out[out.length - 1]] === o) out.pop(); else out.push(o); } return out; }
// Peephole Fuse: merge adjacent halves.
export function fuse(ops) { const out = []; for (const o of ops) { const k = out.length ? out[out.length - 1] + '|' + o : ''; if (FUSE[k]) out[out.length - 1] = FUSE[k]; else out.push(o); } return out; }

// Commutation Peephole: ops on different stacks commute, so an A-only op can slide past B-only
// ops (and the reverse) to meet its inverse or its other half, within a window of w ops.
const SIDE = { sa: 'A', ra: 'A', rra: 'A', sb: 'B', rb: 'B', rrb: 'B' };
const PAIR = { 'ra|rra': '', 'rra|ra': '', 'rb|rrb': '', 'rrb|rb': '', 'sa|sa': '', 'sb|sb': '',
  'ra|rb': 'rr', 'rb|ra': 'rr', 'rra|rrb': 'rrr', 'rrb|rra': 'rrr', 'sa|sb': 'ss', 'sb|sa': 'ss' };
export function commute(ops, w = 8) {
  const out = ops.slice();
  // Partner of out[i] within the window, sliding only past ops on the other stack.
  const find = (i, cancel) => {
    const s = SIDE[out[i]];
    for (let j = i + 1; j < out.length && j <= i + w; j++) {
      const k = out[i] + '|' + out[j];
      if (k in PAIR && (PAIR[k] === '') === cancel) return j;
      const t = SIDE[out[j]]; if (!t || t === s) return -1;   // out[j] does not commute with out[i]
    }
    return -1;
  };
  for (let i = 0; i < out.length; i++) {
    if (!SIDE[out[i]]) continue;
    let j = find(i, true);                     // a cancellation saves two ops: try it first
    const cancel = j >= 0;
    if (!cancel) j = find(i, false);
    if (j < 0) continue;
    if (cancel) { out.splice(j, 1); out.splice(i, 1); } else { out[j] = PAIR[out[i] + '|' + out[j]]; out.splice(i, 1); }
    i = Math.max(-1, i - w - 1);
  }
  return out;
}
// Ops that change nothing when emitted: rotating or swapping a stack of size < 2, or pushing
// from an empty stack.
export function countNoops(input, ops) {
  const a = input.slice(), b = []; let n = 0;
  for (const o of ops) {
    const la = a.length, lb = b.length;
    const idle = (o === 'sa' || o === 'ra' || o === 'rra') ? la < 2 : (o === 'sb' || o === 'rb' || o === 'rrb') ? lb < 2 :
      (o === 'ss' || o === 'rr' || o === 'rrr') ? (la < 2 && lb < 2) : o === 'pa' ? lb === 0 : la === 0;
    if (idle) n++;
    if (o === 'pa' && b.length) a.unshift(b.shift()); else if (o === 'pb' && a.length) b.unshift(a.shift());
    else {
      const sw = s => { if (s.length > 1) { const t = s[0]; s[0] = s[1]; s[1] = t; } }, r = s => { if (s.length > 1) s.push(s.shift()); }, rr = s => { if (s.length > 1) s.unshift(s.pop()); };
      if (o === 'sa' || o === 'ss') sw(a); if (o === 'sb' || o === 'ss') sw(b);
      if (o === 'ra' || o === 'rr') r(a); if (o === 'rb' || o === 'rr') r(b);
      if (o === 'rra' || o === 'rrr') rr(a); if (o === 'rrb' || o === 'rrr') rr(b);
    }
  }
  return n;
}

export function stats(xs) {
  const n = xs.length, mean = xs.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1));
  let min = Infinity, max = -Infinity; for (const x of xs) { if (x < min) min = x; if (x > max) max = x; }
  return { n, mean, sd, se: sd / Math.sqrt(n), min, max };
}
// Paired difference b - a on the same inputs, as "mean ± SE".
export function paired(a, b) { const s = stats(b.map((x, i) => x - a[i])); return s; }
export const f0 = x => Math.round(x).toString(), f1 = x => x.toFixed(1), f2 = x => x.toFixed(2);
export const pm = s => `${s.mean >= 0 ? '+' : '−'}${f1(Math.abs(s.mean))} ± ${f1(s.se)}`;

// Subject thresholds, per run.
export const BARS = { 100: { EXC: 700, GOOD: 1500, PASS: 2000 }, 500: { EXC: 5500, GOOD: 8000, PASS: 12000 } };
export function grade(n, x) { const b = BARS[n]; if (!b) return '~'; return x < b.EXC ? 'EXCELLENT' : x < b.GOOD ? 'GOOD' : x < b.PASS ? 'PASS' : 'FAIL'; }
export const share = (xs, lim) => (100 * xs.filter(x => x < lim).length / xs.length);

// Subject's disorder metric: inversions / pairs; 0 when there are no pairs.
export function disorder(a) {
  const n = a.length; if (n < 2) return 0;
  let c = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (a[i] > a[j]) c++;
  return c / (n * (n - 1) / 2);
}

// Slot of x in a circularly ascending stack s (insert above s[j]); same rule as lisIns.
export function slotAsc(s, x) {
  const ma = s.length;
  for (let q = 0; q < ma; q++) { const pr = s[(q - 1 + ma) % ma], c = s[q]; if (pr < c ? (pr < x && x < c) : (x > pr || x < c)) return q; }
  return 0;
}
// Two-Way Cost: each stack by its shorter direction, shared when the directions agree.
// Returns [cost, type, nA, nB] with type 0 rr-style, 1 rrr-style, 2 ra+rrb, 3 rra+rb.
export function cost2(j, ma, i, mb) {
  const upA = j <= ma / 2, nA = upA ? j : ma - j, upB = i <= mb / 2, nB = upB ? i : mb - i;
  if (upA === upB) return [Math.max(nA, nB), upA ? 0 : 1, nA, nB];
  return [nA + nB, upA ? 2 : 3, nA, nB];
}
// Four-Way Cost, from the sim's cost4, in the same shape.
export function cost4(j, ma, i, mb) { const c = S.cost4(j, (ma - j) % ma, i, (mb - i) % mb); return [c[0], c[4], c[2], c[3]]; }
export const exec = (m, c) => S.doMove(m, [c[0], null, c[2], c[3], c[1]]);
