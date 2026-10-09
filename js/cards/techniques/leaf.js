// Finishers (leaf cards). One per hand, in its own slot. `rest` is how many values a host leaves
// in A for finish(m) to sort with B untouched below; `leaf` is the leaf size a Divide host uses.
import { sortThree } from '../algos/three.js';
import { bfsSortA } from '../leaf.js';

// Five Hand on what is left in A: push the two smallest, Hardcoded Three, pull them back.
export function fiveHand(m) {
  let pushed = 0;
  while (m.a.length > 3) { const mn = Math.min(...m.a); m.why(`push the minimum (${mn})`).bring('a', m.a.indexOf(mn)).op('pb'); pushed++; }
  sortThree(m);
  m.why('pull them back'); for (let i = 0; i < pushed; i++) m.op('pa');
}

export default [
  { id: 'hardcoded-three', role: 'leaf', name: 'Hardcoded Three', grasp: 0, craft: 0, rarity: 'common', rest: 3,
    finish: m => sortThree(m), effect: 'optimal for 3' },
  { id: 'five-hand', role: 'leaf', name: 'Five Hand', grasp: 0, craft: 2, rarity: 'common', rest: 5,
    finish: fiveHand, effect: 'good, not optimal: up to 6 more than the Oracle at 5' },
  { id: 'bfs-leaf', role: 'leaf', name: 'BFS Leaf (≤ 5)', short: 'BFS Leaf', grasp: 2, craft: 6, rarity: 'rare', rest: 5, leaf: 5,
    finish: m => bfsSortA(m), effect: 'Four-End Quicksort: ≤ 3 −95 / −635, ≤ 5 −142 / −657' },
  { id: 'distance-tables', role: 'leaf', name: 'Distance Tables', grasp: 2, craft: 6, rarity: 'legendary', rest: 4, leaf: 4,
    finish: m => bfsSortA(m), effect: 'the same ops as BFS Leaf ≤ 4 (−105 / −657), only faster' },
  { id: 'beam-leaf', role: 'leaf', name: 'Beam Leaf (≤ 32)', short: 'Beam Leaf', grasp: 6, craft: 8, rarity: 'legendary',
    unbuildable: 'Reference builds only: not built here yet. It is the main open space between Four Corners and Oracle\'s Plan.',
    effect: 'ref only' },
].map(c => ({ kind: 'technique', requires: [], conflicts: [], ...c }));
