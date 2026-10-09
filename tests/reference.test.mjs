// Each bare card and each seed deck measures within ±5 % of its "sim" number (spec/10).
import { ALGOS } from '../js/cards/index.js';
import { DECKS, BUILDS } from '../js/cards/decks.js';
import { runAdaptive, buildCompliance } from '../js/core/meta-run.js';
import { ok, meanOps, near, uniform } from './assert.mjs';

// Bare cards, from spec/cards/README.md.
const SIM = {
  'bubble-wheel': [11301, 301410], 'min-extract': [1454, 32298], 'twin-extract': [1117, 22318], 'insert-into-b': [1459, 32251],
  'simple-insertion': [1462, 32242], 'lis-insertion': [547, 5059], turk: [557, 5088], chunks: [662, 5927], butterfly: [577, 5080],
  'bucket-insertion': [606, 4291], 'lsd-radix': [1084, 6784], 'ternary-radix': [1333, 7362], 'msd-radix': [757, 5263], 'quick-2way': [718, 5235],
  'four-end-quicksort': [735, 5033], 'natural-merge': [1495, 10165], 'lookahead-greedy': [557, 5284],
};
const bare = id => ({ algo: id, techs: [], sandbox: true, sharing: true });
export const tests = [
  ['every bare card is within ±5 % of its sim number at n=100 and n=500', () => {
    for (const a of ALGOS) { const s = SIM[a.id]; if (!s) continue; near(meanOps(bare(a.id), 100, 60), s[0], 0.05, `${a.id} @100`); near(meanOps(bare(a.id), 500, a.id === 'bubble-wheel' ? 2 : 10), s[1], 0.05, `${a.id} @500`); }
    ok(Object.keys(SIM).every(id => ALGOS.some(a => a.id === id)));
  }],
  ['LSD Radix: exactly 1084 at n=100 and 6784 at n=500 (zero spread)', () => { ok(meanOps(bare('lsd-radix'), 100, 5) === 1084); ok(meanOps(bare('lsd-radix'), 500, 3) === 6784); }],
  ['every seed deck is within ±5 % of its sim number', () => {
    for (const d of DECKS) { near(meanOps(d.hand, 100, 40), d.sim[0], 0.05, `${d.name} @100`); near(meanOps(d.hand, 500, 8), d.sim[1], 0.05, `${d.name} @500`); }
  }],
  ['technique effects match the spec (paired, n=100)', () => {
    const delta = (a, b, n = 100, k = 60) => meanOps(b, n, k) - meanOps(a, n, k);
    const H = (algo, techs = []) => ({ algo, techs, sandbox: true, sharing: true });
    near(-delta(H('simple-insertion'), H('simple-insertion', ['cheapest-pick'])), 874, 0.06, 'Cheapest Pick alone on Simple Insertion');
    near(-delta(H('simple-insertion'), H('simple-insertion', ['lis-anchor'])), 65, 0.25, 'LIS Anchor on Simple Insertion');
    near(-delta(H('lis-insertion'), H('lis-insertion', ['rb-sink']), 500, 10), 616, 0.15, 'rb Sink on LIS Insertion @500');
    near(-delta(H('chunks'), H('chunks', ['second-max-lookahead'])), 26, 0.3, 'Second-Max on Chunks');
    near(-delta(H('four-end-quicksort'), H('four-end-quicksort', ['bfs-leaf'])), 142, 0.1, 'BFS Leaf ≤ 5 on Four-End Quicksort');
  }],
  ['builds: the strong build is EXCELLENT on every run, compliance is judged per regime', () => {
    const strong = BUILDS.find(b => b.id === 'strong-build');
    for (let s = 1; s <= 30; s++) ok(runAdaptive(strong, uniform(100, s)).ops.length < 700, `strong build seed ${s}`);
    ok(buildCompliance(strong).ok, buildCompliance(strong).problems.join('; '));
    const turkBuild = buildCompliance(BUILDS.find(b => b.id === 'turk-build'));
    ok(!turkBuild.ok && turkBuild.problems.some(p => p.includes('Turk')) && turkBuild.problems.some(p => p.includes('does not grow')), turkBuild.problems.join('; '));
    ok(buildCompliance(BUILDS.find(b => b.id === 'provable-build')).ok);
  }],
];
