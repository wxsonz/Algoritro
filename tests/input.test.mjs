import { parseManual, ranks, disorder, generate, describe, regime, nthPermutation } from '../js/core/input.js';
import { eq, ok } from './assert.mjs';
import { runAdaptive } from '../js/core/meta-run.js';
import { BUILDS } from '../js/cards/decks.js';
import { runHand } from '../js/core/hand.js';
import { stackById, stamp } from '../js/ui/stacks.js';
export const tests = [
  ['manual input follows push_swap rules', () => {
    eq(parseManual('3 -1 +7').values, [3, -1, 7]);
    ok(/not an integer/.test(parseManual('0 one 2').error)); ok(/twice/.test(parseManual('3 2 3').error));
    ok(/32-bit/.test(parseManual('2147483648').error)); eq(parseManual('-2147483648 2147483647').values, [-2147483648, 2147483647]);
    ok(/not an integer/.test(parseManual('1.5').error)); eq(parseManual('').values, []);
  }],
  ['ranks', () => eq(ranks([40, -3, 7]), [2, 0, 1])],
  ['disorder is the subject\'s: inversions ÷ pairs, 0 below 2 values', () => {
    eq(disorder([]), 0); eq(disorder([5]), 0); eq(disorder([0, 1, 2]), 0); eq(disorder([2, 1, 0]), 1);
    eq(disorder(ranks([4, 67, 3, 87, 23])), 0.4);      // the subject's --bench example: 40.00 %
  }],
  ['exact-disorder generator hits its target', () => { for (const d of [0, 0.1, 0.5, 1]) eq(disorder(generate('disorder', 100, 3, d)).toFixed(4), d.toFixed(4)); }],
  ['generators are deterministic per seed', () => { eq(generate('uniform', 50, 9), generate('uniform', 50, 9)); ok(generate('uniform', 50, 9).join() !== generate('uniform', 50, 10).join()); }],
  ['every order: the seed picks one of the n! orders', () => {
    const all = Array.from({ length: 120 }, (_, k) => generate('perm', 5, k).join());
    eq(new Set(all).size, 120); eq(nthPermutation(3, 5), [2, 1, 0]); eq(generate('perm', 3, 6), [0, 1, 2]);
  }],
  ['Adaptive Selector is optimal on every order of 3 and 5', () => {
    const build = BUILDS[0].build || BUILDS[0], worst = (n, k) => Math.max(...Array.from({ length: k }, (_, i) => { const r = runAdaptive(build, generate('perm', n, i)); ok(r.valid); return r.ops.length; }));
    eq(worst(3, 6), 2); eq(worst(5, 120), 8); eq(runAdaptive(build, [0, 1]).ops.length, 0);
  }],
  ['the tiny stacks know their optimum (the Oracle\'s worst order) and stamp it gold', () => {
    for (const id of ['three', 'five']) {
      const b = stackById[id], worst = Math.max(...b.seeds.map(k => runHand({ algo: 'oracle', techs: [], sandbox: true }, generate('perm', b.n, k), { keepSteps: false }).ops.length));
      eq(worst, b.best);
    }
    eq(stamp(stackById.five, 8), 'EXCELLENT'); eq(stamp(stackById.five, 10), 'GOOD'); eq(stamp(stackById.five, 12), 'PASS'); eq(stamp(stackById.five, 13), 'FAIL');
    eq(stamp(stackById.three, 2), 'EXCELLENT'); eq(stamp(stackById.three, 3), 'PASS');
  }],
  ['the new shapes', () => {
    eq(generate('valley', 6), [5, 3, 1, 0, 2, 4]); eq(generate('interleave', 6), [0, 3, 1, 4, 2, 5]); eq(generate('interleave', 5), [0, 3, 1, 4, 2]);
    eq(generate('nearrev', 10, 1, 0), [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]); eq([...generate('nearrev', 50, 4)].sort((a, b) => a - b), [...Array(50).keys()]);
  }],
  ['describe and regimes', () => { const d = describe([3, 1, 2]); eq([d.n, d.lis], [3, 2]); eq(regime(0.1), 'simple (O(n²))'); eq(regime(0.5), 'complex (O(n log n))'); }],
];
