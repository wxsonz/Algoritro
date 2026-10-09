import { turk } from '../engines/insertion.js';
// Lookahead Greedy: Turk, scoring each of the b cheapest moves by itself plus the cheapest next
// move, re-planning after every move.
export default {
  id: 'lookahead-greedy', kind: 'algorithm', family: 'search', name: 'Lookahead Greedy', tagline: 'Think k moves ahead',
  rarity: 'rare', claimedClass: 'n²', proof: 'yes', knows: ['slot',  'rotdist',  'greedy',  'shared',  'heuristic'], fns: 13, from: "est.: Turk's 10 (gemini-flash-3.8) plus 3 to price each pick two moves deep", lesson: true,
  slots: 2, natives: { pick: 'cheapest pick, priced with lookahead', cost: 'lookahead (k = 2)' }, open: ['anchor', 'band'], defaults: { anchor: 'keep-three' },
  finisher: 'hardcoded-three', finishers: ['hardcoded-three', 'five-hand', 'bfs-leaf', 'distance-tables'],
  params: { b: { label: 'candidates per level b', type: 'int', min: 2, max: 50, def: () => 10 }, commit: { label: 'commit to both moves', type: 'bool', def: () => false } },
  run(m, { opt, finisher, params }) {
    const keep = opt.keep ? opt.keep(m.a.slice()) : null;
    turk(m, { keep, rest: finisher.rest, finish: finisher.finish, cost: 4, sbSeed: !!opt.sbSeed, sharing: opt.sharing, look: params.b, commit: params.commit });
  },
};
