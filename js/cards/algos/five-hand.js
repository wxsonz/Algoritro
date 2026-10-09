import { minExtract } from './min-extract.js';
// Five Hand: push the two smallest, its inner Three, pull back.
export default {
  id: 'five-hand', kind: 'algorithm', family: 'small', name: 'Five Hand', tagline: 'Push the two smallest, fix three, pull back',
  rarity: 'common', claimedClass: '1', proof: 'yes', grasp: 2, craft: 4, lines: 40, slots: 0, maxN: 5, playsAs: 'five-hand',
  finisher: 'hardcoded-three', finishers: ['hardcoded-three', 'bfs-leaf', 'distance-tables'],
  run(m, { finisher }) { minExtract(m, Math.min(3, finisher.rest), finisher.finish); },
};
