import { insertion, beamInsertion } from '../engines/insertion.js';
// Simple Insertion: pb everything, then insert B's top into its slot in A. The lab bench of the
// Insertion family: every Insertion technique plugs into it.
export default {
  id: 'simple-insertion', kind: 'algorithm', family: 'insertion', name: 'Simple Insertion', tagline: 'Empty A, then insert back',
  rarity: 'uncommon', claimedClass: 'n²', proof: 'yes', grasp: 4, craft: 4, lines: 100,
  slots: 4, natives: {}, open: ['anchor', 'pick', 'cost', 'band', 'order'], defaults: {},
  run(m, { opt }) {
    const keep = opt.keep ? opt.keep(m.a.slice()) : new Set();
    const o = { keep, pick: opt.pick || 'top', cost: opt.cost || 2, bands: opt.bands || 1, sharing: opt.sharing, look: opt.look || 0 };
    if (opt.beam) beamInsertion(m, { ...o, ...opt.beam }); else insertion(m, o);
  },
};
