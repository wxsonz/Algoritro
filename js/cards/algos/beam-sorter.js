import { beamSorter } from '../engines/insertion.js';
// Beam Sorter: keep the W best partial insertion plans, scored by ops so far plus an estimate of
// the rest, over the whole problem.
export default {
  id: 'beam-sorter', kind: 'algorithm', family: 'search', name: 'Beam Sorter', tagline: 'Keep the best few futures',
  rarity: 'legendary', claimedClass: 'heuristic', proof: 'no', knows: ['lis',  'slot',  'rotdist',  'shared',  'beam',  'heuristic'], fns: 30, from: "counted: the explorer's reference build (lis.c 3, beam.c 5, beam_cost.c 5, beam_kids.c 5, beam_level.c 5, beam_mem.c 4, beam_end.c 3)", slots: 0, maxN: 1000,
  // Its reference build (C, Norm style, study/explorer-refs): moves on the study's seeds 1000–1004,
  // each stream checked by the study's independent replayer. tests/reference.test.mjs runs this card
  // on the same inputs and expects the same counts.
  ref: { 100: [494, 506, 489, 440, 467], 500: [4695, 4609, 4550, 4483, 4668] },
  params: {
    W: { label: 'beam width W', type: 'int', min: 1, max: 512, def: () => 64 },
    c: { label: 'expansions per plan', type: 'int', min: 1, max: 10, def: () => 4 },
    h: { label: 'heuristic weight h', type: 'num', min: 0, max: 2, step: 0.05, def: () => 0.25 },
  },
  run(m, { params }) { beamSorter(m, params); },
};
