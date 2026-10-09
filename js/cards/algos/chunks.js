import { chunks, equalCuts, annealCuts } from '../engines/bucket.js';
import { Machine } from '../../core/machine.js';
// Chunks: split the ranks into K chunks; push each chunk in turn, sinking its lower half; then
// retrieve B's max repeatedly.
export default {
  id: 'chunks', kind: 'algorithm', family: 'bucket', name: 'Chunks', tagline: 'Ship it in crates',
  rarity: 'common', claimedClass: 'n√n', proof: 'avg', knows: ['ranges'], fns: 2, from: "counted: the explorer's reference build chunks.c (one_chunk, run_chunks); the sweep, band and retrieval cards add their own",
  slots: 3, natives: {}, open: ['anchor', 'sweep', 'band', 'retrieval', 'order'],
  defaults: { sweep: 'nearest-member-sweep', band: 'rb-sink', retrieval: 'max-retrieval' },
  caveats: { anchor: 'Possible (skip LIS values while sweeping), but kept values sit between chunk members and add rotations. Expect a small effect.' },
  params: { K: { label: 'chunk count K', type: 'int', min: 1, max: 100, def: n => Math.max(1, Math.round(Math.sqrt(n) / 2)), formula: 'round(√n / 2)', grows: true,
    presets: { 'round(√n / 2)': n => Math.max(1, Math.round(Math.sqrt(n) / 2)), 'round(0.4√n) (tuned)': n => Math.max(1, Math.round(0.4 * Math.sqrt(n))), '5 / 11 (step)': n => n <= 100 ? 5 : 11 } } },
  run(m, { opt, params }) {
    const n = m.a.length, K = Math.max(1, Math.min(params.K, Math.max(1, n)));
    const o = { sweep: opt.sweep, band: opt.band, ret: opt.ret, cost: 2 };
    let cuts = equalCuts(n, K);
    if (opt.anneal) {
      const r = m.a.slice();
      cuts = annealCuts(r, K, c => { const s = new Machine(r); s.quiet = true; chunks(s, c, o); return s.ops.length; }, opt.anneal);
      m.phase('plan').why(`annealed boundaries: ${cuts.join(', ')}`);
    }
    chunks(m, cuts, o);
  },
};
