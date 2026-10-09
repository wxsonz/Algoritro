// Measurement jobs, shared by the browser's Web Worker and tools/pool.mjs (Node worker threads).
//   { kind: 'hand', hand, n, gen, param, seeds }      → { ops: [...], ms: [...], invalid }
//   { kind: 'build', build, n, gen, param, seeds, thresholds, metric } → { ops, ms, regimes }
//   { kind: 'gap', hand, n }                          → { hist, worst: [[perm, extra]], total }  (every permutation, vs the Oracle)
//   { kind: 'cells', hand, n, gen, param, seeds }     → { moves: [16][seeds], invalid }  (the hand once per seed, then each
//                                                        subset of the post cards applied to its moves, as runHand would)
import { runHand } from '../core/hand.js';
import { runAdaptive } from '../core/meta-run.js';
import { generate, ranks } from '../core/input.js';
import { distanceTable } from '../cards/algos/oracle.js';
import { useDpTables } from '../cards/engines/divide.js';
import { loadData } from '../core/data.js';
import { techById } from '../cards/index.js';
import { POSTS } from '../core/stackcache.js';

let ready = null;
export const init = () => (ready ??= loadData('dp-plans').then(useDpTables).catch(() => {}));

const input = (j, s) => ranks(generate(j.gen || 'uniform', j.n, s, j.param));
export async function runJob(j, progress) {
  await init();
  if (j.kind === 'gap') return gap(j, progress);
  if (j.kind === 'cells') return cells(j, progress);
  const ops = [], ms = [], regimes = []; let invalid = 0;
  j.seeds.forEach((s, i) => {
    const r = input(j, s);
    const res = j.kind === 'build' ? runAdaptive(j.build, r, { thresholds: j.thresholds, metric: j.metric }) : runHand(j.hand, r, { keepSteps: false });
    if (!res.valid) invalid++;
    ops.push(res.ops.length); ms.push(res.ms); if (res.regime) regimes.push(res.regime);
    progress?.((i + 1) / j.seeds.length);
  });
  return { ops, ms, regimes, invalid };
}
// One run per seed serves all 16 subsets of the post cards: they only rewrite the finished moves.
function cells(j, progress) {
  const moves = Array.from({ length: 1 << POSTS.length }, () => []), passes = POSTS.map(id => techById[id]); let invalid = 0;
  j.seeds.forEach((s, i) => {
    const r = input(j, s), base = runHand(j.hand, r, { keepSteps: false });
    if (!base.valid) invalid++;
    for (let mask = 0; mask < moves.length; mask++) {
      let steps = base.ops.map(op => ({ op }));   // a fresh list each time: a pass may rewrite it in place
      passes.forEach((t, k) => { if (mask & (1 << k)) steps = t.rewrite(steps, r); });
      moves[mask].push(steps.length);
    }
    progress?.((i + 1) / j.seeds.length);
  });
  return { moves, invalid };
}
const tables = {};
function gap(j, progress) {
  const n = j.n, t = (tables[n] ??= distanceTable(n)), hist = {}, worst = []; let total = 0, count = 0;
  const p = [...Array(n).keys()], all = [];
  (function go(i) { if (i === n) { all.push(p.slice()); return; } for (let k = i; k < n; k++) { [p[i], p[k]] = [p[k], p[i]]; go(i + 1); [p[i], p[k]] = [p[k], p[i]]; } })(0);
  all.forEach((perm, i) => {
    const extra = runHand(j.hand, perm, { keepSteps: false }).ops.length - t.of(perm);
    hist[extra] = (hist[extra] || 0) + 1; total += extra; count++;
    worst.push([perm, extra]); if (worst.length > 40) { worst.sort((a, b) => b[1] - a[1]); worst.length = 20; }
    if (i % 500 === 0) progress?.(i / all.length);
  });
  worst.sort((a, b) => b[1] - a[1]);
  return { hist, worst: worst.slice(0, 10), mean: total / count, count };
}
