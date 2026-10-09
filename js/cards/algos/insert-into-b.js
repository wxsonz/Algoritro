import { intoB, turk } from '../engines/insertion.js';
// Insert-into-B: keep B circularly sorted (descending) as you go. With Cheapest Pick it becomes a
// Turk without Keep Three: every value is priced, none is kept unless an anchor keeps it.
export default {
  id: 'insert-into-b', kind: 'algorithm', family: 'insertion', name: 'Insert-into-B', tagline: 'Keep B sorted as you go',
  rarity: 'uncommon', claimedClass: 'n²', proof: 'yes', grasp: 4, craft: 4, lines: 90,
  slots: 2, natives: {}, open: ['anchor', 'pick', 'cost'], defaults: {},
  caveats: { anchor: 'The anchor stays in A, but this card inserts into B. Use the mirrored form: kept values are rotated past and never pushed.' },
  run(m, { opt }) {
    const keep = opt.keep ? opt.keep(m.a.slice()) : new Set();
    if (opt.pick === 'cheapest') turk(m, { keep, cost: opt.cost || 2, sharing: opt.sharing, look: opt.look || 0 });
    else intoB(m, { keep });
  },
};
