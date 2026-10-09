import { bucketBeam } from '../engines/planned.js';
// Bucket Beam, the study's best --medium (claude-opus-5.5-max), ported op for op: planned
// three-way splits down to buckets of at most ⌈√n⌉ consecutive ranks, then each bucket sorted by
// insertion around its longest increasing run, in the order a beam over insertion orders finds
// cheapest. O(n√n): the splits cost O(n log n), and a bucket of b values O(b²) whatever the order.
export default {
  id: 'bucket-beam', kind: 'algorithm', family: 'bucket', name: 'Bucket Beam', tagline: 'Plan the crates, fill each one in its best order',
  rarity: 'legendary', claimedClass: 'n√n', proof: 'yes', knows: ['ranges', 'slot', 'shared'], fns: 14,
  from: 'counted: claude-opus-5.5-max bucket.c (4), bucket_extract.c (3), ins_cost.c (ins_slot, rotcost, ins_cost), ins_emit.c and emit.c\'s emit_rot, strategies.c (medium_alloc, sort_medium); its built-in cards add their own',
  slots: 0, natives: { ends: 'four-ends', split: 'dp-splits', anchor: 'lis-anchor', order: 'beam-over-orders' },
  run(m) { bucketBeam(m); },
};
