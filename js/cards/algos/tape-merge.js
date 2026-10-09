import { tapeMerge } from '../engines/divide.js';
// Tape Merge: external merge sort on the stack ends, a balanced two-way merge with no restores.
export default {
  id: 'tape-merge', kind: 'algorithm', family: 'divide', name: 'Tape Merge', tagline: 'Merge sort on four tapes',
  rarity: 'legendary', claimedClass: 'n log n', proof: 'yes', grasp: 8, craft: 8, lines: 350, slots: 0,
  // Its reference build (C, Norm style, study/explorer-refs): moves on the study's seeds 1000–1004,
  // each stream checked by the study's independent replayer. tests/reference.test.mjs runs this card
  // on the same inputs and expects the same counts.
  ref: { 100: [1200, 1200, 1200, 1200, 1200], 500: [9000, 8000, 8000, 9000, 8000] },
  finisher: null, finisherNote: 'optional: sorts the first runs', finishers: ['bfs-leaf', 'distance-tables'],
  run(m, { finisher }) { tapeMerge(m, { leaf: finisher ? finisher.leaf : 0 }); },
};
