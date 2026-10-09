// The study's claude-opus-5.5-max strategies, ported (js/cards/engines/planned.js): DP Splits with
// Beam Leaf (its --complex) and Bucket Beam (its --medium), held to that build's own counts on the
// study's seeds 1000–1004 (values from random.Random(seed).sample(range(-100000, 100000), n)).
import { runHand } from '../js/core/hand.js';
import { resolve } from '../js/core/hand.js';
import { deckById } from '../js/cards/decks.js';
import { cancel, fuse } from '../js/cards/techniques/post.js';
import { meetsSeat } from '../js/core/stackcache.js';
import { ok, eq, near, uniform } from './assert.mjs';
// claude-opus-5.5-max, per seed: its final streams, and the same with its peephole removed.
const MAX = {
  complex: { 100: [419, 428, 423, 420, 408], 500: [3081, 3107, 3115, 3142, 3109], raw100: [434, 444, 439, 436, 425], raw500: [3219, 3249, 3236, 3284, 3233] },
  medium: { 100: [483, 487, 484, 499, 488], 500: [3392, 3423, 3429, 3369, 3359], raw100: [512, 526, 517, 533, 524], raw500: [3543, 3568, 3586, 3544, 3515] },
};
const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
// One run per input, without the post cards; the deck's Peephole Cancel and Fuse then apply.
function measure(deck, n, seeds) {
  const h = deckById[deck].hand, bare = { ...h, techs: h.techs.filter(t => !t.startsWith('peephole')) };
  return seeds.map(s => { const r = runHand(bare, uniform(n, s), { keepSteps: false }); ok(r.valid, `${deck} @${n} seed ${s}`); return [r.ops.length, fuse(cancel(r.ops.map(op => ({ op })))).length]; });
}
export const tests = [
  ['Bucket Beam is claude-opus-5.5-max --medium move for move, within 2 % with the peepholes (n=100 and 500)', () => {
    for (const n of [100, 500]) {
      const got = measure('planned-crates', n, [1000, 1001, 1002, 1003, 1004]);
      eq(got.map(x => x[0]), MAX.medium['raw' + n], `raw @${n}`);
      near(mean(got.map(x => x[1])), mean(MAX.medium[n]), 0.02, `Planned Crates @${n}`);
    }
  }],
  ['Four-End Quicksort + DP Splits + Beam Leaf is claude-opus-5.5-max --complex move for move, and its count with the peepholes', () => {
    const at100 = measure('oracles-plan', 100, [1000, 1001, 1002, 1003, 1004]);
    eq(at100.map(x => x[0]), MAX.complex.raw100, 'raw @100'); eq(at100.map(x => x[1]), MAX.complex[100], '@100');
    const at500 = measure('oracles-plan', 500, [1000, 1001]);   // about 3.5 s a sort
    eq(at500.map(x => x[0]), MAX.complex.raw500.slice(0, 2), 'raw @500'); eq(at500.map(x => x[1]), MAX.complex[500].slice(0, 2), '@500');
  }],
  ['Beam Leaf needs DP Splits; Bucket Beam meets --medium\'s class target', () => {
    ok(!resolve({ algo: 'four-end-quicksort', techs: ['beam-leaf'], sandbox: true }).ok, 'Beam Leaf without DP Splits');
    ok(resolve({ algo: 'four-end-quicksort', techs: ['dp-splits', 'beam-leaf'], sandbox: true }).ok, 'with DP Splits');
    ok(meetsSeat({ algo: 'bucket-beam', techs: [] }, 'medium'), 'Bucket Beam in --medium');
  }],
];
