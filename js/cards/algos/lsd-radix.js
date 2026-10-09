import { lsdRadix } from '../engines/simple.js';
// LSD Radix: per bit, low to high, walk A once: pb on 0, ra on 1; then pa everything back.
export default {
  id: 'lsd-radix', kind: 'algorithm', family: 'digit', name: 'LSD Radix', tagline: 'One bit at a time',
  rarity: 'common', claimedClass: 'n log n', proof: 'yes', grasp: 4, craft: 2, lines: 40, slots: 0,
  params: { skipSorted: { label: 'skip sorted passes', type: 'bool', def: () => false } },
  run(m, { params }) { lsdRadix(m, { skipSorted: params.skipSorted }); },
};
