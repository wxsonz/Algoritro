import { tapeMerge } from '../engines/research.js';
// Tape Merge: external merge sort on the stack ends, a balanced two-way merge with no restores.
export default {
  id: 'tape-merge', kind: 'algorithm', family: 'divide', name: 'Tape Merge', tagline: 'Merge sort on four tapes',
  rarity: 'legendary', claimedClass: 'n log n', proof: 'yes', grasp: 8, craft: 8, lines: 350, slots: 0, research: true,
  finisher: null, finisherNote: 'optional: sorts the first runs', finishers: ['bfs-leaf', 'distance-tables'],
  run(m, { finisher }) { tapeMerge(m, { leaf: finisher ? finisher.leaf : 0 }); },
};
