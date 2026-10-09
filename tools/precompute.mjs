// Precompute ☢: every legal hand on every stack at the default seed, with the 16 subsets of the
// post cards, written to data/stacks.json (objective.md §10). The Table starts from this file, so
// a first visit needs no measuring at all.
// Usage: node tools/precompute.mjs           (about half a minute on 30 cores)
//        node tools/precompute.mjs --check N (recompute N random cells and compare with the file)
import { writeFileSync, readFileSync } from 'node:fs';
import { pool } from './pool.mjs';
import { codeVersion } from './version.mjs';
import { STACKS, SEED } from '../js/ui/stacks.js';
import { everyHand, baseKey, runnable, compact, POSTS } from '../js/core/stackcache.js';

const OUT = new URL('../data/stacks.json', import.meta.url);
const job = (h, b) => ({ kind: 'cells', hand: h, n: b.n, gen: b.gen, param: b.param, seeds: b.seeds || [SEED] });
const SLOW = { 'beam-sorter': 400, annealer: 40, 'bubble-wheel': 30, 'lookahead-greedy': 12 };
const cost = (h, b) => (SLOW[h.algo] || 1) * b.n * (b.seeds?.length || 1);
const P = pool(), t0 = Date.now(), log = s => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}`);

if (process.argv[2] === '--check') {
  const file = JSON.parse(readFileSync(OUT)), k = +process.argv[3] || 20, hands = everyHand();
  let bad = 0;
  for (let i = 0; i < k; i++) {
    const h = hands[Math.floor(Math.random() * hands.length)], si = Math.floor(Math.random() * STACKS.length), b = STACKS[si];
    if (!runnable(h, b)) continue;
    const r = await P.run(job(h, b)), want = JSON.stringify(compact(b, r.moves)), got = JSON.stringify(file.hands[baseKey(h)]?.[si]);
    if (want !== got) { bad++; console.log(`differs: ${baseKey(h)} on ${b.id}`); }
  }
  console.log(bad ? `${bad} of ${k} cells differ` : `${k} random cells match the file`); await P.close(); process.exit(bad ? 1 : 0);
}

const hands = everyHand(), cells = [];
hands.forEach((h, hi) => STACKS.forEach((b, si) => { if (runnable(h, b)) cells.push({ h, b, hi, si }); }));
cells.sort((x, y) => cost(y.h, y.b) - cost(x.h, x.b));   // the slowest first, so they do not finish last
log(`${hands.length} legal hands × ${STACKS.length} stacks: ${cells.length} cells on ${P.size} workers`);
const rows = hands.map(() => STACKS.map(() => null));
let done = 0;
await Promise.all(cells.map(async c => {
  const r = await P.run(job(c.h, c.b));
  if (r.invalid) throw new Error(`invalid moves: ${baseKey(c.h)} on ${c.b.id}`);
  rows[c.hi][c.si] = compact(c.b, r.moves);
  if (++done % 2000 === 0) log(`${done} of ${cells.length}`);
}));
const file = { version: codeVersion(), seed: SEED, posts: POSTS, stacks: STACKS.map(b => b.id), hands: Object.fromEntries(hands.map((h, i) => [baseKey(h), rows[i]])) };
writeFileSync(OUT, JSON.stringify(file));
log(`wrote data/stacks.json (${(JSON.stringify(file).length / 1024).toFixed(0)} KB, version ${file.version})`);
await P.close();
