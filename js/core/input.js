// Inputs: generators, manual parsing with push_swap's rules, rank compression, and the
// measurements the Table always shows.
import { rng, randInt, shuffle } from './rng.js';

const INT_MIN = -2147483648, INT_MAX = 2147483647;

// Generators return values (ranks 0..n-1 here; manual input can be any int32).
export const GENERATORS = {
  uniform: { label: 'uniform', param: null, make: (n, next) => shuffle([...Array(n).keys()], next) },
  nearly: { label: 'nearly sorted (k swaps)', param: { name: 'k', def: 3 },
    make: (n, next, k) => { const a = [...Array(n).keys()]; for (let t = 0; t < k && n > 1; t++) { const i = randInt(next, n), j = randInt(next, n); [a[i], a[j]] = [a[j], a[i]]; } return a; } },
  reversed: { label: 'reversed', param: null, make: n => [...Array(n).keys()].reverse() },
  sorted: { label: 'sorted', param: null, make: n => [...Array(n).keys()] },
  rotated: { label: 'rotated sorted', param: { name: 'offset', def: 10 }, make: (n, next, k) => [...Array(n).keys()].map(i => (i + (n ? k % n : 0)) % (n || 1)) },
  organ: { label: 'organ pipe', param: null, make: n => { const a = []; for (let i = 0; i < n; i += 2) a.push(i); for (let i = n - 1 - (n % 2 ? 1 : 0); i > 0; i -= 2) a.push(i); return a; } },
  sawtooth: { label: 'sawtooth (k runs)', param: { name: 'k', def: 4 }, make: (n, next, k) => { k = Math.max(1, Math.min(n || 1, Math.round(k))); const a = []; for (let j = 0; j < k; j++) for (let x = j; x < n; x += k) a.push(x); return a; } },
  disorder: { label: 'exact disorder', param: { name: 'd', def: 0.2 }, make: (n, next, d) => exactDisorder(n, Math.min(1, Math.max(0, d)), next) },
  valley: { label: 'down then up', param: null, make: n => GENERATORS.organ.make(n).map(v => n - 1 - v) },
  interleave: { label: 'interleaved halves', param: null, make: n => { const h = Math.ceil(n / 2), a = []; for (let i = 0; i < h; i++) { a.push(i); if (h + i < n) a.push(h + i); } return a; } },
  nearrev: { label: 'nearly reversed (k swaps)', param: { name: 'k', def: 3 }, make: (n, next, k) => GENERATORS.nearly.make(n, next, k).map(v => n - 1 - v) },
  perm: { label: 'one order (the seed picks which)', param: null, make: (n, next, p, seed) => nthPermutation(n, seed) },
};

// The k-th of the n! orders, in lexicographic order (k wraps around).
export function nthPermutation(n, k) {
  let f = 1; for (let i = 2; i <= n; i++) f *= i;
  k = ((Math.floor(k) % f) + f) % f;
  const pool = [...Array(n).keys()], out = [];
  for (let i = n; i > 0; i--) { f /= i; out.push(pool.splice(Math.floor(k / f), 1)[0]); k %= f; }
  return out;
}

export function generate(kind, n, seed, param) {
  const g = GENERATORS[kind]; if (!g) throw new Error('unknown generator ' + kind);
  return g.make(n, rng(seed), param ?? g.param?.def, seed);
}

// Exact disorder d: a random Lehmer code with exactly round(d·n(n−1)/2) inversions.
export function exactDisorder(n, d, next) {
  const cap = [...Array(n).keys()].map(i => n - 1 - i), c = new Array(n).fill(0);
  let K = Math.round(d * n * (n - 1) / 2); const open = [...Array(n).keys()].filter(i => cap[i] > 0);
  while (K > 0 && open.length) { const j = randInt(next, open.length), i = open[j]; c[i]++; K--; if (c[i] === cap[i]) open.splice(j, 1); }
  const avail = [...Array(n).keys()]; return c.map(ci => avail.splice(ci, 1)[0]);
}

// Manual input: integers only, signed 32-bit, no duplicates. Returns { values } or { error }.
export function parseManual(text) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const values = [];
  for (const t of tokens) {
    if (!/^[+-]?\d+$/.test(t)) return { error: `"${t}" is not an integer` };
    const v = Number(t);
    if (v < INT_MIN || v > INT_MAX) return { error: `${t} is outside the 32-bit integer range` };
    values.push(v);
  }
  const seen = new Set();
  for (const v of values) { if (seen.has(v)) return { error: `${v} appears twice` }; seen.add(v); }
  return { values };
}

// Rank Compression: replace each value with its rank 0..n-1.
export function ranks(values) {
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(values.length); order.forEach(([, i], k) => { r[i] = k; });
  return r;
}

// The subject's disorder: inversions ÷ pairs, 0 when there are no pairs. O(n log n) by merge sort.
export function inversions(a) {
  const arr = a.slice(), tmp = new Array(arr.length);
  function sort(lo, hi) {
    if (hi - lo < 2) return 0;
    const mid = (lo + hi) >> 1; let c = sort(lo, mid) + sort(mid, hi), i = lo, j = mid, k = lo;
    while (i < mid && j < hi) { if (arr[i] <= arr[j]) tmp[k++] = arr[i++]; else { tmp[k++] = arr[j++]; c += mid - i; } }
    while (i < mid) tmp[k++] = arr[i++]; while (j < hi) tmp[k++] = arr[j++];
    for (let t = lo; t < hi; t++) arr[t] = tmp[t];
    return c;
  }
  return sort(0, arr.length);
}
export function disorder(a) { const n = a.length; return n < 2 ? 0 : inversions(a) / (n * (n - 1) / 2); }
export const regime = d => d < 0.2 ? 'simple (O(n²))' : d < 0.5 ? 'medium (O(n√n))' : 'complex (O(n log n))';

export function lisLength(a) {
  const t = []; for (const x of a) { let lo = 0, hi = t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] < x) lo = m + 1; else hi = m; } t[lo] = x; }
  return t.length;
}
export function runs(a) { if (!a.length) return { count: 0, longest: 0 }; let count = 1, cur = 1, longest = 1; for (let i = 1; i < a.length; i++) { if (a[i] > a[i - 1]) cur++; else { count++; cur = 1; } longest = Math.max(longest, cur); } return { count, longest }; }

export function describe(values) {
  const r = ranks(values), d = disorder(r), ru = runs(r);
  return { n: r.length, ranks: r, disorder: d, regime: regime(d), lis: lisLength(r), runs: ru.count, longestRun: ru.longest };
}
