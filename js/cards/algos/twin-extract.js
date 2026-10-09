import { twinExtract } from '../engines/simple.js';
export default {
  id: 'twin-extract', kind: 'algorithm', family: 'selection', name: 'Twin Extract', tagline: 'Smallest or largest, whichever is closer',
  rarity: 'uncommon', claimedClass: 'n²', proof: 'yes', knows: ['rotdist',  'greedy'], fns: 5, from: "est.: Min Extract's 3, plus choosing the nearer extreme and sinking a maximum", slots: 0,
  finisher: 'hardcoded-three', finishers: ['hardcoded-three', 'five-hand', 'bfs-leaf', 'distance-tables'],
  run(m, { finisher }) { twinExtract(m, { rest: finisher.rest, finish: finisher.finish }); },
};
