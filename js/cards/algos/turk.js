import { turk } from '../engines/insertion.js';
// Turk: price every value of A into its target in B, the four ways; take the cheapest; repeat.
// Window Pick is Cheapest Pick's param: only the w values nearest either end are priced.
export default {
  id: 'turk', kind: 'algorithm', family: 'insertion', name: 'Turk', tagline: 'Always make the cheapest move',
  rarity: 'common', claimedClass: 'n²', proof: 'yes', grasp: 4, craft: 6, lines: 250,
  slots: 3, natives: { pick: 'cheapest-pick' }, open: ['anchor', 'cost', 'band', 'order'], defaults: { anchor: 'keep-three', cost: 'four-way-cost' },
  finisher: 'hardcoded-three', finishers: ['hardcoded-three', 'five-hand', 'bfs-leaf', 'distance-tables'],
  params: { window: { label: 'candidate window w (0 = all)', type: 'int', min: 0, max: 500, def: () => 0 } },
  run(m, { opt, finisher, params }) {
    const keep = opt.keep ? opt.keep(m.a.slice()) : null;
    turk(m, { keep, rest: finisher.rest, finish: finisher.finish, cost: opt.cost, sbSeed: !!opt.sbSeed, sharing: opt.sharing, look: opt.look || 0, window: params.window });
  },
};
