import { distanceTable } from '../js/cards/algos/oracle.js';
import { eq, perms } from './assert.mjs';
// Reference counts from spec/10-tests.md: [n, inputs, states, max, sum].
const FIX = [[2, 2, 6, 1, 1], [3, 6, 24, 2, 7], [4, 24, 120, 5, 69], [5, 120, 720, 8, 583], [6, 720, 5040, 10, 5083], [7, 5040, 40320, 13, 46903], [8, 40320, 362880, 16, 467324]];
export const tests = FIX.map(([n, inputs, states, max, sum]) => [`optimal counts at n=${n} match the spec`, () => {
  const t = distanceTable(n); eq(t.size, states, 'states'); let c = 0, s = 0, m = 0;
  for (const p of perms(n)) { const d = t.of(p); c++; s += d; m = Math.max(m, d); }
  eq([c, m, s], [inputs, max, sum]);
}]);
