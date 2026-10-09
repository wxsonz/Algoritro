import { sortThree } from './three.js';
// Min Extract: rotate the minimum to the top by the shorter way, pb, until `rest` remain; finish
// those; pa everything back.
export function minExtract(m, rest = 3, finish = sortThree) {
  m.phase('extract');
  while (m.a.length > rest) { const mn = m.min('a'); m.focus({ mover: mn }).why(`bring the minimum (${mn}) to the top, then push it`).bring('a', m.indexOf('a', mn)).op('pb'); }
  m.focus(null).phase('finish'); finish(m);
  m.phase('return'); while (m.b.length) m.why('B holds the minimums in descending order').op('pa');
}
export default {
  id: 'min-extract', kind: 'algorithm', family: 'selection', name: 'Min Extract', tagline: 'Grab the smallest, every time',
  rarity: 'common', claimedClass: 'n²', proof: 'yes', knows: ['rotdist'], fns: 3, from: "counted: gpt-6-sol-high sort_simple.c (sort_simple) and sort_utils.c (find_value, bring_top)",
  slots: 0, natives: { anchor: 'keep-three' }, open: [], defaults: {}, finisher: 'hardcoded-three', finishers: ['hardcoded-three', 'five-hand', 'bfs-leaf', 'distance-tables'],
  run(m, { finisher }) { minExtract(m, finisher.rest, finisher.finish); },
};
