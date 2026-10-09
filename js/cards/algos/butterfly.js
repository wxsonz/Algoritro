import { butterfly } from '../engines/bucket.js';
// Butterfly (K-sort): with i values pushed so far, push A's top if its rank is ≤ i + w (sinking
// it if ≤ i), otherwise rotate past it; then retrieve.
export default {
  id: 'butterfly', kind: 'algorithm', family: 'bucket', name: 'Butterfly', tagline: 'A sliding window',
  rarity: 'uncommon', claimedClass: 'n√n', proof: 'no', knows: ['ranges'], fns: 2, from: "est.: the window loop and its rule; the band and retrieval cards add their own",
  slots: 2, natives: { sweep: 'the window rule' }, open: ['band', 'retrieval'], defaults: { band: 'rb-sink', retrieval: 'max-retrieval' },
  params: { w: { label: 'window w', type: 'int', min: 1, max: 200, def: n => (n <= 100 ? 15 : 30), formula: '15 / 30 (step)', grows: false,
    presets: { '15 / 30 (step)': n => (n <= 100 ? 15 : 30), 'round(1.4√n)': n => Math.max(1, Math.round(1.4 * Math.sqrt(n))) } } },
  proofNote: 'O(n√n) only when w grows like √n; with a constant w it is O(n²).',
  run(m, { opt, params }) { butterfly(m, params.w, { ret: opt.ret, cost: 2 }); },
};
