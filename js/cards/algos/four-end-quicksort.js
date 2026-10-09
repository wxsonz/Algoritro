import { fourEnds } from '../engines/divide.js';
// Four-End Quicksort: the tops and bottoms of A and B are four locations. A chunk at one is split
// by exact rank into three parts, each sent to another location; the max part is sorted first.
export default {
  id: 'four-end-quicksort', kind: 'algorithm', family: 'divide', name: 'Four-End Quicksort', tagline: 'Four bins, never step over anyone',
  rarity: 'rare', claimedClass: 'n log n', proof: 'yes', knows: ['recursion',  'partition'], fns: 2, from: "counted: claude-opus-5.5-high quick.c (quick_chunk, sort_complex); Four Ends and Thirds Split add their own",
  slots: 3, natives: { ends: 'four-ends' }, open: ['split', 'pivot', 'order'], defaults: { split: 'thirds-split', pivot: 'equal thirds' },
  finisher: null, finisherNote: 'none: the recursion goes down to single values', finishers: ['bfs-leaf', 'distance-tables', 'beam-leaf'],
  run(m, { opt, finisher }) {
    fourEnds(m, { parts: opt.parts || 2, pivot: opt.pivot === 'leaf' ? 'leaf' : 'equal', leaf: finisher ? finisher.leaf : 1, dp: !!opt.dp });
  },
};
