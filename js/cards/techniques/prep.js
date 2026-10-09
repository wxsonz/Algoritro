// Prep cards run before the first op. They stack and use no slot.
import { disorder } from '../../core/input.js';

export default [
  {
    id: 'rank-compression', kind: 'technique', role: 'prep', name: 'Rank Compression', tagline: 'Forget the values, keep the order',
    grasp: 0, craft: 2, rarity: 'common', always: true,
    effect: 'enables most cards; 0 ops by itself',
    // The explorer always runs on ranks: input.js compresses values before any card sees them.
    prepare() { return false; },
  },
  {
    id: 'presorted-shortcut', kind: 'technique', role: 'prep', name: 'Presorted Shortcut', tagline: 'Don\'t fix what isn\'t broken',
    grasp: 0, craft: 0, rarity: 'common',
    effect: 'sorted input → 0; a rotation by k → min(k, n − k)',
    // If A is a rotation of the sorted order, bring 0 up the shorter way and stop.
    prepare(m) {
      const a = m.a, n = a.length, p = a.indexOf(0);
      for (let i = 0; i < n; i++) if (a[(p + i) % n] !== i) return false;
      m.phase('presorted').why(p ? 'A is a rotation of the sorted order' : 'A is already sorted').bring('a', p);
      return true;
    },
  },
  {
    id: 'disorder-meter', kind: 'technique', role: 'prep', name: 'Disorder Meter', tagline: 'How messy is it?',
    grasp: 2, craft: 2, rarity: 'common',
    effect: 'none on its own: it feeds the Adaptive Selector',
    prepare(m, info) { info.disorder = disorder(m.a); return false; },
  },
].map(c => ({ kind: 'technique', requires: [], conflicts: [], ...c }));
