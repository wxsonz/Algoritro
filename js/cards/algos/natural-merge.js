import { naturalMerge } from '../engines/divide.js';
export default {
  id: 'natural-merge', kind: 'algorithm', family: 'divide', name: 'Natural Merge', tagline: 'Merge the runs that are already there',
  rarity: 'rare', claimedClass: 'n log n', proof: 'yes', knows: ['merge'], fns: 4, from: "est.: finding the runs, merging two past the rest, a pass and the loop", slots: 0, lesson: true,
  run(m) { naturalMerge(m); },
};
