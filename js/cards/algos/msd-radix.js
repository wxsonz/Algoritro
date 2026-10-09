import { quick2 } from '../engines/divide.js';
// MSD Radix: split each range at its top bit, recursively. On ranks it is Quick 2-Way with the
// pivot at a power of two.
export default {
  id: 'msd-radix', kind: 'algorithm', family: 'digit', name: 'MSD Radix', tagline: 'Biggest digit first, then recurse',
  rarity: 'uncommon', claimedClass: 'n log n', proof: 'yes', knows: ['digits',  'recursion',  'partition'], fns: 2, uses: ['quick-core'], from: "est.: the top-bit cut and an entry, on the two-way partition it shares with Quick 2-Way", slots: 0,
  finisherNote: 'built in: sa / sb on leaves of 2',
  run(m) { quick2(m, { pivot: 'msd' }); },
};
