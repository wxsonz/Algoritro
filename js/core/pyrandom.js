// Python's random, bit for bit: MT19937 with CPython's seeding, getrandbits, _randbelow and
// random.sample. So Random(seed).sampleRange(lo, hi, n) gives exactly the list that
// random.Random(seed).sample(range(lo, hi), n) gives in Python, and a seed names the same input
// here, in the study's builds and in a peer's Python tester. Ported from the push_swap
// visualizer's rng.js.
const N = 624, M = 397;

export class Random {
  constructor(seed = 0) { this.mt = new Uint32Array(N); this.mti = N + 1; this.seed(seed); }
  initGenrand(s) {
    const mt = this.mt; mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) { const x = mt[i - 1] ^ (mt[i - 1] >>> 30); mt[i] = (Math.imul(1812433253, x) + i) >>> 0; }
    this.mti = N;
  }
  initByArray(key) {
    const mt = this.mt; let i = 1, j = 0;
    this.initGenrand(19650218);
    for (let k = Math.max(N, key.length); k > 0; k--) {
      const x = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(x, 1664525)) + key[j] + j) >>> 0;
      i++; j++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
      if (j >= key.length) j = 0;
    }
    for (let k = N - 1; k > 0; k--) {
      const x = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(x, 1566083941)) - i) >>> 0;
      i++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
    }
    mt[0] = 0x80000000;
  }
  // Python seeds an int by splitting abs(seed) into 32-bit words, low first.
  seed(seed) {
    let s = Math.abs(Math.floor(Number(seed) || 0)); const key = [];
    do { key.push(s % 4294967296); s = Math.floor(s / 4294967296); } while (s > 0);
    this.initByArray(key);
  }
  uint32() {
    const mt = this.mt;
    if (this.mti >= N) {
      let kk = 0, y;
      for (; kk < N - M; kk++) { y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff); mt[kk] = mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0); }
      for (; kk < N - 1; kk++) { y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff); mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0); }
      y = (mt[N - 1] & 0x80000000) | (mt[0] & 0x7fffffff); mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      this.mti = 0;
    }
    let y = mt[this.mti++];
    y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18;
    return y >>> 0;
  }
  // getrandbits(k) for 0 < k ≤ 53; words are filled low first, as in CPython.
  getrandbits(k) {
    if (k <= 32) return this.uint32() >>> (32 - k);
    let out = 0, mul = 1;
    for (; k > 0; k -= 32) { let r = this.uint32(); if (k < 32) r >>>= 32 - k; out += r * mul; mul *= 4294967296; }
    return out;
  }
  // CPython's _randbelow_with_getrandbits: rejection sampling on bit_length(n) bits.
  randbelow(n) {
    if (n <= 1) return 0;
    let k = 0; for (let m = n; m >= 1; m = Math.floor(m / 2)) k++;
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }
  // random.random(): a 53-bit float, built as CPython builds it.
  random() { const a = this.uint32() >>> 5, b = this.uint32() >>> 6; return (a * 67108864 + b) / 9007199254740992; }
  // random.sample(range(lo, hi), k), with both of CPython's branches (a pool, or a set of picks).
  sampleRange(lo, hi, k) {
    const n = hi - lo, out = new Array(k);
    if (k < 0 || k > n) throw new RangeError('sample larger than population');
    let setsize = 21;
    if (k > 5) setsize += 4 ** Math.ceil(Math.log(k * 3) / Math.log(4));
    if (n <= setsize) {
      const pool = Array.from({ length: n }, (_, i) => lo + i);
      for (let i = 0; i < k; i++) { const j = this.randbelow(n - i); out[i] = pool[j]; pool[j] = pool[n - i - 1]; }
      return out;
    }
    const picked = new Set();
    for (let i = 0; i < k; i++) { let j = this.randbelow(n); while (picked.has(j)) j = this.randbelow(n); picked.add(j); out[i] = lo + j; }
    return out;
  }
}
