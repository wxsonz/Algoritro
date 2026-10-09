import { ternaryRadix } from '../engines/simple.js';
export default {
  id: 'ternary-radix', kind: 'algorithm', family: 'digit', name: 'Ternary Radix', tagline: 'Three-way digits using both ends of B',
  rarity: 'rare', claimedClass: 'n log n', proof: 'yes', grasp: 6, craft: 6, lines: 150, slots: 0,
  params: { mode: { label: 'gather layout', type: 'enum', options: { spec: 'as described', best: 'cheaper layout per pass' }, def: () => 'spec' } },
  run(m, { params }) { ternaryRadix(m, { mode: params.mode }); },
};
