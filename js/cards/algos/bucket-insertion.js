import { chunks, bucketCuts } from '../engines/bucket.js';
// Bucket Insertion: buckets of ⌊c·√n⌋ ranks pushed by One-Way Sweep with rb Sink, then cheapest
// insertion restricted to the highest bucket left, which keeps the O(n√n) proof.
export default {
  id: 'bucket-insertion', kind: 'algorithm', family: 'bucket', name: 'Bucket Insertion', tagline: 'Crates, then careful unpacking',
  rarity: 'rare', claimedClass: 'n√n', proof: 'yes', grasp: 6, craft: 6, lines: 300,
  slots: 3, natives: { pick: 'cheapest, within the current bucket', retrieval: 'cheapest, within the current bucket' },
  open: ['sweep', 'band', 'cost', 'order'], defaults: { sweep: 'one-way-sweep', band: 'rb-sink', cost: 'two-way-cost' },
  caveats: { sweep: 'Playable, but a nearest-member sweep can pass the same value many times. That breaks the O(n√n) proof that One-Way Sweep gives.' },
  params: { c: { label: 'bucket width ⌊c·√n⌋, c', type: 'num', min: 0.5, max: 20, step: 0.5, def: () => 4, formula: '⌊4√n⌋', grows: true } },
  run(m, { opt, params }) { chunks(m, bucketCuts(m.a.length, params.c), { sweep: opt.sweep, band: opt.band, ret: 'bucket', cost: opt.cost }); },
};
