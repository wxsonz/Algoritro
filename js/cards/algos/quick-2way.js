import { quick2, fourEnds } from '../engines/divide.js';
// Quick 2-Way: push the lower half of a chunk to B, rotate the rest past and restore, recurse;
// mirror for B. With Four Ends played it becomes the four-ends engine with 2-value leaves.
export default {
  id: 'quick-2way', kind: 'algorithm', family: 'divide', name: 'Quick 2-Way', tagline: 'Split at the median, recurse',
  rarity: 'uncommon', claimedClass: 'n log n', proof: 'yes', knows: ['recursion',  'partition'], fns: 2, uses: ['quick-core'], from: "est.: the median cut and the leaves of 2 and 3, on its two-way partition",
  slots: 4, natives: {}, open: ['ends', 'split', 'pivot', 'order'],
  defaults: { ends: 'two ends, rotations restored', split: 'halves', pivot: 'median-pivot' },
  finisher: 'built-in', finisherNote: 'built in: sa / sb on leaves of 2', finishers: ['bfs-leaf', 'distance-tables'],
  params: { restoreAll: { label: 'always restore (even the whole stack)', type: 'bool', def: () => false } },
  unbuilt(opt, finisher) {
    if (opt.fourEnds) return null;
    if (opt.pivot === 'leaf') return 'Pivot by Leaf Count on two ends is not built yet: play Four Ends first.';
    if (finisher) return 'A Finisher on two ends is not built yet: play Four Ends first.';
    if (opt.parts === 3 || opt.dp) return 'Needs a third destination: play Four Ends.';
    return null;
  },
  run(m, { opt, finisher, params }) {
    if (opt.fourEnds) fourEnds(m, { parts: opt.parts || 2, pivot: opt.pivot === 'leaf' ? 'leaf' : 'equal', leaf: finisher ? finisher.leaf : 2, dp: !!opt.dp });
    else quick2(m, { skipWhole: !params.restoreAll });
  },
};
