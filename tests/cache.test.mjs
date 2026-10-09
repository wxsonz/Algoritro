// The stack cache (objective.md §10) and the shipped precompute, data/stacks.json.
import { readFileSync } from 'node:fs';
import { StackCache, everyHand, baseKey, runnable, compact, POSTS } from '../js/core/stackcache.js';
import { runJob } from '../js/workers/jobs.js';
import { runHand } from '../js/core/hand.js';
import { generate, ranks } from '../js/core/input.js';
import { STACKS, SEED, stackById } from '../js/ui/stacks.js';
import { codeVersion } from '../tools/version.mjs';
import { eq, ok } from './assert.mjs';
const file = JSON.parse(readFileSync(new URL('../data/stacks.json', import.meta.url)));
const cache = new StackCache(); cache.ingest(file);
export const tests = [
  ['data/stacks.json is up to date with the code (else run node tools/precompute.mjs)', () => eq(file.version, codeVersion())],
  ['it holds every legal hand on every stack it can run, at the default seed', () => {
    eq(file.seed, SEED); eq(file.posts, POSTS);
    let missing = 0; for (const h of everyHand()) STACKS.forEach((b, i) => { if (runnable(h, b) && !file.hands[baseKey(h)]?.[i]) missing++; });
    eq(missing, 0);
  }],
  ['a hand finds its cell whatever its cards\' order, with its post cards in the cache\'s order', () => {
    const b = stackById['random-100'];
    const a = everyHand().find(h => h.algo === 'turk' && h.techs.length >= 2), a2 = { ...a, techs: [...a.techs].reverse() };
    ok(cache.get(a, b, SEED) && cache.get(a, b, SEED).ops === cache.get(a2, b, SEED).ops, 'slot cards in any order');
    ok(cache.get({ ...a, techs: [...a.techs, 'peephole-cancel', 'peephole-fuse'] }, b, SEED), 'post cards in POSTS order');
    ok(!cache.get({ ...a, techs: [...a.techs, 'peephole-fuse', 'peephole-cancel'] }, b, SEED), 'post cards out of order are measured on their own');
    ok(!cache.get({ ...a, params: { w: 3 } }, b, SEED), 'a changed knob is measured on its own');
    ok(!cache.get(a, b, 4242), 'another seed is not this seed');
  }],
  ['its cells equal fresh runs, post cards included', async () => {
    const pick = [['turk', 'random-500'], ['four-end-quicksort', 'reversed-100'], ['lis-insertion', 'five'], ['lsd-radix', 'messy75-100'], ['bucket-insertion', 'nearly-500']];
    for (const [algo, id] of pick) {
      const b = stackById[id], h = everyHand().find(x => x.algo === algo && runnable(x, b));
      eq(JSON.stringify(compact(b, (await runJob({ kind: 'cells', hand: h, n: b.n, gen: b.gen, param: b.param, seeds: b.seeds || [SEED] })).moves)), JSON.stringify(file.hands[baseKey(h)][STACKS.indexOf(b)]));
      const withPosts = { ...h, techs: [...h.techs, 'peephole-cancel'] }, want = Math.max(...(b.seeds || [SEED]).map(s => runHand(withPosts, ranks(generate(b.gen, b.n, s, b.param)), { keepSteps: false }).ops.length));
      eq(cache.get(withPosts, b, SEED).ops, want);
    }
  }],
];
