// The growth check (spec/09) flags what it must flag and passes what it must pass.
import { classCheck, GROWTH_SIZES, OFFLINE_SIZES } from '../js/core/metrics.js';
import { meanOps } from './assert.mjs';
const curve = (hand, sizes = [...GROWTH_SIZES, ...OFFLINE_SIZES]) => sizes.map(n => [n, meanOps(hand, n, n >= 2048 ? 2 : n >= 500 ? 3 : 6, 11)]);
const H = (algo, techs = [], extra = {}) => ({ algo, techs, sandbox: true, sharing: true, ...extra });
const check = (hand, cls) => classCheck(curve(hand), cls);
import { ok } from './assert.mjs';
const show = c => c.checks.map(x => `n=${x.n} ${(x.excess * 100).toFixed(1)} %`).join(', ');
export const tests = [
  ['flags Butterfly and Chunks with constant params', () => {
    const b = check(H('butterfly'), 'n√n'); ok(b.flagged, 'Butterfly 15 / 30: ' + show(b));
    const c = check(H('chunks', [], { presets: { K: '5 / 11 (step)' } }), 'n√n'); ok(c.flagged, 'Chunks 5 / 11: ' + show(c));
  }],
  ['passes √n-scaled params, Quick 2-Way and LSD Radix', () => {
    for (const [h, cls] of [[H('butterfly', [], { presets: { w: 'round(1.4√n)' } }), 'n√n'], [H('chunks', ['one-way-sweep']), 'n√n'], [H('quick-2way'), 'n log n'], [H('lsd-radix'), 'n log n']]) {
      const c = check(h, cls); ok(!c.flagged, `${h.algo}: ${show(c)}`);
    }
  }],
  ['flags Turk labelled O(n log n)', () => { const c = check(H('turk'), 'n log n'); ok(c.flagged, show(c)); }],
];
