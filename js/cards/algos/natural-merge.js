import { naturalMerge } from '../engines/divide.js';
export default {
  id: 'natural-merge', kind: 'algorithm', family: 'divide', name: 'Natural Merge', tagline: 'Merge the runs that are already there',
  rarity: 'rare', claimedClass: 'n log n', proof: 'yes', grasp: 4, craft: 6, lines: 150, slots: 0, lesson: true,
  run(m) { naturalMerge(m); },
};
