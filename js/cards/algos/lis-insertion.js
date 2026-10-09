import { insertion, beamInsertion } from '../engines/insertion.js';
// LIS Insertion: keep a longest increasing subsequence in A, push the rest, insert them back by
// cheapest pick.
export default {
  id: 'lis-insertion', kind: 'algorithm', family: 'insertion', name: 'LIS Insertion', tagline: 'Keep the longest ordered line, insert the rest',
  rarity: 'rare', claimedClass: 'n²', proof: 'yes', knows: ['slot',  'rotdist'], fns: 2, uses: ['insert-core'], from: "counted: claude-opus-5.5-high simple.c (push_rest, sort_simple) on its insertion core; LIS Anchor, Cheapest Pick and Two-Way Cost add their own",
  slots: 3, natives: { anchor: 'lis-anchor', pick: 'cheapest-pick' }, open: ['cost', 'band', 'order'], defaults: { cost: 'two-way-cost' },
  run(m, { opt }) {
    const o = { keep: opt.keep(m.a.slice()), pick: 'cheapest', cost: opt.cost, bands: opt.bands || 1, sharing: opt.sharing, look: opt.look || 0 };
    if (opt.beam) beamInsertion(m, { ...o, ...opt.beam }); else insertion(m, o);
  },
};
