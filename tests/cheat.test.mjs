// The two cheats (objective.md §6), searched in the shipped precompute at the default seed.
import { readFileSync } from 'node:fs';
import { StackCache, bestPerStack, bestBuild, meetsSeat, seatScore, better } from '../js/core/stackcache.js';
import { resolve, runHand, parseDeck } from '../js/core/hand.js';
import { classProblems } from '../js/core/meta-run.js';
import { generate, ranks } from '../js/core/input.js';
import { BUILDS } from '../js/cards/decks.js';
import { STACKS, SEED, stackRoute, stackById } from '../js/ui/stacks.js';
import { eq, ok } from './assert.mjs';
const cache = new StackCache(); cache.ingest(JSON.parse(readFileSync(new URL('../data/stacks.json', import.meta.url))));
const SEATS = ['simple', 'medium', 'complex'];
const routes = Object.fromEntries(STACKS.map(b => [b.id, stackRoute(b, SEED)]));
const strong = BUILDS.find(b => b.id === 'strong-build');
const best = bestBuild(cache, SEED, routes, Object.fromEntries(SEATS.map(k => [k, [strong[k]]])));
const ceiling = bestPerStack(cache, SEED);
const seatRecs = (h, k) => STACKS.filter(b => routes[b.id].route === k).map(b => cache.get(h, b, SEED));
const worstOps = (h, b) => Math.max(...(b.seeds || [SEED]).map(s => runHand(h, ranks(generate(b.gen, b.n, s, b.param)), { keepSteps: false }).ops.length));
export const tests = [
  ['no seat of Best push_swap breaks its class target', () => {
    for (const k of SEATS) {
      const h = best[k].hand;
      ok(resolve(h).ok, `${k}: the hand is legal`);
      ok(meetsSeat(h, k), `${k}: ${h.algo} meets the class target`);
      eq(classProblems(h), []);
    }
  }],
  ['Best push_swap is never worse than the starting build, seat by seat and in total', () => {
    let mine = 0, theirs = 0;
    for (const k of SEATS) {
      const s = seatScore(seatRecs(strong[k], k));
      ok(!better(s, best[k].score), `${k}: ${JSON.stringify(best[k].score)} against the strong build's ${JSON.stringify(s)}`);
      mine += best[k].score[2]; theirs += s[2];
    }
    ok(mine <= theirs, `total ${mine} against ${theirs}`);
  }],
  ['Best card per stack is the ceiling: no seat of any build beats it on any stack', () => {
    for (const b of STACKS) {
      const c = ceiling[b.id], route = routes[b.id].route;
      if (route === 'tiny') continue;
      ok(c.ops <= best[route].recs[b.id].ops, `${b.id}: ${c.ops} against Best push_swap's ${best[route].recs[b.id].ops}`);
      const mine = cache.get(strong[route], b, SEED); ok(!mine || c.ops <= mine.ops, `${b.id}: against the strong build`);
    }
  }],
  ['the cheats\' cards replay to the moves they claim', () => {
    for (const id of ['random-100', 'rotated-100', 'random-500', 'five']) { const c = ceiling[id]; eq(worstOps(c.hand, stackById[id]), c.ops); }
    for (const k of SEATS) { const [id, r] = Object.entries(best[k].recs)[0]; eq(worstOps(best[k].hand, stackById[id]), r.ops); }
  }],
  ['a card in play that breaks the class argument fails the seat, even as a default', () => {
    ok(!meetsSeat(parseDeck('chunks'), 'medium'), 'Chunks with its default Nearest-Member Sweep');
    ok(meetsSeat(parseDeck('chunks+one-way-sweep'), 'medium'), 'Chunks with One-Way Sweep');
    ok(meetsSeat(parseDeck('bucket-insertion'), 'medium'), 'Bucket Insertion');
  }],
];
