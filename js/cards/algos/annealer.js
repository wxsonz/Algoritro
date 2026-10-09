import { chunks, equalCuts, annealCuts } from '../engines/bucket.js';
import { Machine } from '../../core/machine.js';
// Annealer: simulated annealing over a plan. Here the plan is the chunk boundaries of the Crate
// Runner hand (Chunks with One-Way Sweep and Second-Max); every trial re-runs the whole hand.
export default {
  id: 'annealer', kind: 'algorithm', family: 'search', name: 'Annealer', tagline: 'Shake it until it settles',
  rarity: 'legendary', claimedClass: 'heuristic', proof: 'no', grasp: 8, craft: 6, lines: 200, slots: 0,
  // Its reference build (C, Norm style, study/explorer-refs): moves on the study's seeds 1000–1004,
  // each stream checked by the study's independent replayer. tests/reference.test.mjs runs this card
  // on the same inputs and expects the same counts.
  ref: { 100: [543, 566, 581, 598, 570], 500: [5064, 5104, 5121, 5089, 5092] },
  params: {
    K: { label: 'chunk count K', type: 'int', min: 2, max: 100, def: n => Math.max(2, Math.round(0.4 * Math.sqrt(n))), formula: 'round(0.4√n)', grows: true },
    budget: { label: 'trials', type: 'int', min: 0, max: 5000, def: () => 400 },
  },
  run(m, { params }) {
    const r = m.a.slice(), o = { sweep: 'oneway', band: 'sink', ret: 'second' };
    const K = Math.max(1, Math.min(params.K, r.length || 1));
    const cuts = r.length > 2 ? annealCuts(r, K, c => { const s = new Machine(r); chunks(s, c, o); return s.ops.length; }, { budget: params.budget }) : equalCuts(r.length, K);
    m.phase('plan').why(`annealed boundaries after ${params.budget} trials: ${cuts.join(', ')}`);
    chunks(m, cuts, o);
  },
};
