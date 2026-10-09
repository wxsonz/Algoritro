import { quick2 } from '../engines/divide.js';
// MSD Radix: split each range at its top bit, recursively. On ranks it is Quick 2-Way with the
// pivot at a power of two.
export default {
  id: 'msd-radix', kind: 'algorithm', family: 'digit', name: 'MSD Radix', tagline: 'Biggest digit first, then recurse',
  rarity: 'uncommon', claimedClass: 'n log n', proof: 'yes', grasp: 6, craft: 6, lines: 200, slots: 0,
  finisherNote: 'built in: sa / sb on leaves of 2',
  run(m) { quick2(m, { pivot: 'msd' }); },
};
