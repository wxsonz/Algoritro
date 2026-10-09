import { beamSorter } from '../engines/research.js';
// Beam Sorter: keep the W best partial insertion plans, scored by ops so far plus an estimate of
// the rest, over the whole problem.
export default {
  id: 'beam-sorter', kind: 'algorithm', family: 'search', name: 'Beam Sorter', tagline: 'Keep the best few futures',
  rarity: 'legendary', claimedClass: 'heuristic', proof: 'no', grasp: 10, craft: 10, lines: 600, slots: 0, research: true, maxN: 1000,
  params: {
    W: { label: 'beam width W', type: 'int', min: 1, max: 512, def: () => 64 },
    c: { label: 'expansions per plan', type: 'int', min: 1, max: 10, def: () => 4 },
    h: { label: 'heuristic weight h', type: 'num', min: 0, max: 2, step: 0.05, def: () => 0.25 },
  },
  run(m, { params }) { beamSorter(m, params); },
};
