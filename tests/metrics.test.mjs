import { grade, thresholds, counts, stats, passRate } from '../js/core/metrics.js';
import { eq, ok } from './assert.mjs';
export const tests = [
  ['grades use the subject thresholds', () => { eq(grade(100, 699), 'EXCELLENT'); eq(grade(100, 700), 'GOOD'); eq(grade(100, 1999), 'PASS'); eq(grade(100, 2000), 'FAIL'); eq(grade(500, 5499), 'EXCELLENT'); eq(grade(500, 11999), 'PASS'); }],
  ['other sizes are interpolated by a power law and marked ~', () => { const t = thresholds(300); ok(t.approx && t.EXCELLENT > 700 && t.EXCELLENT < 5500); ok(grade(300, 10).startsWith('~')); eq(Math.round(thresholds(100).EXCELLENT), 700); }],
  ['counts use the --bench layout', () => eq(Object.keys(counts(['pa'])), ['sa', 'sb', 'ss', 'pa', 'pb', 'ra', 'rb', 'rr', 'rra', 'rrb', 'rrr'])],
  ['stats and pass rate', () => { const s = stats([1, 2, 3]); eq([s.mean, s.min, s.max], [2, 1, 3]); eq(passRate(100, [600, 800]).EXCELLENT, 0.5); }],
];
