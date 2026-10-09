import { lsdRadix } from '../engines/simple.js';
// LSD Radix: per bit, low to high, walk A once: pb on 0, ra on 1; then pa everything back.
export default {
  id: 'lsd-radix', kind: 'algorithm', family: 'digit', name: 'LSD Radix', tagline: 'One bit at a time',
  rarity: 'common', claimedClass: 'n log n', proof: 'yes', knows: ['digits'], fns: 2, from: "counted: gpt-6-sol-high sort_complex.c (radix_pass, sort_complex)", slots: 0,
  params: { skipSorted: { label: 'skip sorted passes', type: 'bool', def: () => false } },
  run(m, { params }) { lsdRadix(m, { skipSorted: params.skipSorted }); },
};
