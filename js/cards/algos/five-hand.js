import { minExtract } from './min-extract.js';
// Five Hand: push the two smallest, its inner Three, pull back.
export default {
  id: 'five-hand', kind: 'algorithm', family: 'small', name: 'Five Hand', tagline: 'Push the two smallest, fix three, pull back',
  rarity: 'common', claimedClass: '1', proof: 'yes', knows: ['rotdist'], fns: 2, from: "counted: gemini-flash-3.8 sort_small.c (push_min_to_b, sort_five); Hardcoded Three sorts the last three", slots: 0, maxN: 5, playsAs: 'five-hand',
  finisher: 'hardcoded-three', finishers: ['hardcoded-three', 'bfs-leaf', 'distance-tables'],
  run(m, { finisher }) { minExtract(m, Math.min(3, finisher.rest), finisher.finish); },
};
