// Seeded PRNG (mulberry32). The same seed always gives the same sequence.
export function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randInt = (next, n) => Math.floor(next() * n);
export function shuffle(arr, next) {
  for (let i = arr.length - 1; i > 0; i--) { const j = randInt(next, i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
