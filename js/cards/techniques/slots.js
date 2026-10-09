// Technique cards for the slot roles. Each slot role holds one card per hand (spec/04).
// `hook` is merged into the options the host's engine reads; `hosts` lists the Algorithm cards
// the card is built for, so any other host with the role open shows it as an open space.
import { lisKeep, circKeep, runKeep } from '../lib.js';

const INS = ['simple-insertion', 'lis-insertion', 'turk', 'insert-into-b', 'lookahead-greedy'];

export default [
  // anchor
  { id: 'lis-anchor', role: 'anchor', name: 'LIS Anchor', tagline: 'Keep the longest ordered line', grasp: 4, craft: 2, rarity: 'rare',
    hosts: ['simple-insertion', 'turk', 'insert-into-b', 'lookahead-greedy'], hook: { keep: lisKeep },
    effect: 'Simple Insertion −65 @100, −366 @500; on Turk −9 / +49' },
  { id: 'circular-lis-anchor', role: 'anchor', name: 'Circular LIS Anchor', tagline: 'The line can wrap around', grasp: 2, craft: 2, rarity: 'rare',
    hosts: ['simple-insertion', 'turk', 'insert-into-b', 'lookahead-greedy'], hook: { keep: circKeep },
    effect: 'LIS host −6 @100, −17 @500; on Turk −13 / +45' },
  { id: 'longest-run-anchor', role: 'anchor', name: 'Longest Run Anchor', tagline: 'Keep the longest contiguous ordered block', grasp: 0, craft: 2, rarity: 'uncommon',
    hosts: ['simple-insertion', 'turk', 'insert-into-b', 'lookahead-greedy'], hook: { keep: runKeep },
    effect: 'Simple Insertion + Cheapest Pick −7 @100, −20 @500; on Turk +20 / +83' },
  { id: 'keep-three', role: 'anchor', name: 'Keep Three', tagline: 'Leave three, sort them by hand', grasp: 0, craft: 0, rarity: 'common',
    hosts: ['turk', 'lookahead-greedy', 'min-extract'], hook: { keep: null },
    effect: 'Turk default, Min Extract native' },
  // pick
  { id: 'cheapest-pick', role: 'pick', name: 'Cheapest Pick', tagline: 'Look at everyone before moving', grasp: 2, craft: 4, rarity: 'common',
    hosts: ['simple-insertion', 'insert-into-b'], hook: { pick: 'cheapest' },
    effect: 'LIS host −850 @100 (1397 → 547); alone on Simple Insertion −874' },
  // cost
  { id: 'two-way-cost', role: 'cost', name: 'Two-Way Cost', grasp: 0, craft: 2, rarity: 'common',
    hosts: ['simple-insertion', 'lis-insertion', 'turk', 'insert-into-b', 'bucket-insertion'], hook: { cost: 2, look: 0 },
    effect: 'baseline for Cheapest Pick' },
  { id: 'four-way-cost', role: 'cost', name: 'Four-Way Cost', tagline: 'Price all four ways', grasp: 2, craft: 2, rarity: 'common', requires: ['pick'],
    hosts: ['simple-insertion', 'lis-insertion', 'turk', 'insert-into-b', 'bucket-insertion'], hook: { cost: 4, look: 0 },
    effect: 'LIS host −4 @100, −19 @500; Turk −4 / −19' },
  { id: 'lookahead-k', role: 'cost', name: 'Lookahead-k', tagline: 'Price the move after next', grasp: 2, craft: 4, rarity: 'rare', requires: ['pick'], lesson: true,
    hosts: ['simple-insertion', 'lis-insertion', 'turk', 'insert-into-b'], hook: { cost: 4, look: 3 },
    effect: 'worse: Turk −2 @100, +175 @500; Long Line +25 / +297' },
  // band
  { id: 'rb-sink', role: 'band', name: '`rb` Sink (Two Bands)', short: 'rb Sink', tagline: 'Low ones to the floor', grasp: 2, craft: 2, rarity: 'uncommon',
    hosts: ['simple-insertion', 'lis-insertion', 'chunks', 'bucket-insertion', 'butterfly'], hook: { bands: 2, band: 'sink' },
    effect: 'LIS host −14 @100, −93 @200, −616 @500' },
  { id: 'multi-band', role: 'band', name: 'Multi-Band', tagline: 'More floors', grasp: 2, craft: 4, rarity: 'rare', unbuildable: 'B has only two cheap ends, so a third band has nowhere to go. Its measurable part is rb Sink\'s split point.',
    hosts: [], hook: {}, effect: 'not buildable as written' },
  { id: 'sb-seed', role: 'band', name: '`sb` Seed', short: 'sb Seed', grasp: 0, craft: 0, rarity: 'uncommon', lesson: true,
    hosts: ['turk', 'lookahead-greedy'], hook: { sbSeed: true }, effect: 'Turk +0.3: the sb costs more than it saves' },
  { id: 'middle-out-push', role: 'band', name: 'Middle-Out Push', grasp: 2, craft: 2, rarity: 'uncommon', lesson: true,
    hosts: ['chunks', 'bucket-insertion'], hook: { band: 'middle', bands: 1 }, effect: 'Chunks +141 @100, +1794 @500 instead of rb Sink' },
  // sweep
  { id: 'nearest-member-sweep', role: 'sweep', name: 'Nearest-Member Sweep', grasp: 0, craft: 2, rarity: 'common',
    hosts: ['chunks', 'bucket-insertion'], hook: { sweep: 'nearest' }, effect: 'Chunks +16 @100, +140 @500 vs One-Way' },
  { id: 'one-way-sweep', role: 'sweep', name: 'One-Way Sweep', tagline: 'Pass each value once', grasp: 2, craft: 2, rarity: 'rare',
    hosts: ['chunks', 'bucket-insertion'], hook: { sweep: 'oneway' }, effect: 'Chunks −16 @100, −140 @500 vs Nearest-Member; gives the n√n proof' },
  // retrieval
  { id: 'max-retrieval', role: 'retrieval', name: 'Max Retrieval', grasp: 0, craft: 2, rarity: 'common',
    hosts: ['chunks', 'butterfly'], hook: { ret: 'max' }, effect: 'baseline for buckets' },
  { id: 'second-max-lookahead', role: 'retrieval', name: 'Second-Max Lookahead', short: 'Second-Max', tagline: 'Grab the runner-up on the way', grasp: 2, craft: 2, rarity: 'uncommon',
    requires: [{ role: 'retrieval', hostDefault: 'max-retrieval' }],
    hosts: ['chunks', 'butterfly'], hook: { ret: 'second' }, effect: 'Chunks −26 @100, −385 @500; Butterfly −19 / −279' },
  { id: 'rank-range-max', role: 'retrieval', name: 'Rank-Range Max', grasp: 2, craft: 2, rarity: 'uncommon',
    hosts: ['chunks', 'butterfly'], hook: { ret: 'rank' }, effect: '0 by construction: a correctness and CPU fix' },
  { id: 'cheapest-return', role: 'retrieval', name: 'Cheapest Return', tagline: 'Turk on the way back', grasp: 2, craft: 4, rarity: 'rare',
    hosts: ['chunks', 'butterfly'], hook: { ret: 'cheapest' }, effect: 'Chunks +21 @100, −494 @500' },
  // ends
  { id: 'four-ends', role: 'ends', name: 'Four Ends', grasp: 4, craft: 4, rarity: 'rare',
    hosts: ['quick-2way'], hook: { fourEnds: true }, effect: 'vs Quick 2-Way, both with 2-value leaves: +6 @100, −355 @500' },
  { id: 'restore-skip', role: 'ends', name: 'Restore Skip', grasp: 0, craft: 2, rarity: 'uncommon',
    hosts: ['quick-2way'], hook: { skipWhole: true }, effect: 'the whole-stack case is in the bare Quick 2-Way (−139 / −732 vs always restoring)' },
  // split
  { id: 'thirds-split', role: 'split', name: 'Thirds Split', tagline: 'Three-way partition', grasp: 4, craft: 4, rarity: 'rare',
    requires: [{ role: 'ends', card: 'four-ends' }], conflicts: ['median-pivot'],
    hosts: ['quick-2way', 'four-end-quicksort'], hook: { parts: 3 }, effect: 'given Four Ends, no Finisher: −86 @100, −330 @500' },
  { id: 'dp-splits', role: 'split', name: 'DP Splits', tagline: 'Plan every split in advance', grasp: 4, craft: 6, rarity: 'legendary',
    requires: [{ role: 'ends', card: 'four-ends' }], conflicts: ['median-pivot', 'pivot-by-leaf-count'],
    hosts: ['quick-2way', 'four-end-quicksort'], hook: { dp: true }, effect: 'vs Pivot by Leaf Count, BFS Leaf ≤ 5: −17 @100, −214 @500' },
  // pivot
  { id: 'median-pivot', role: 'pivot', name: 'Median Pivot', grasp: 0, craft: 0, rarity: 'common', conflicts: ['thirds-split', 'dp-splits'],
    hosts: ['quick-2way', 'four-end-quicksort'], hook: { pivot: 'equal', parts: 2 }, effect: 'Quick 2-Way baseline' },
  { id: 'pivot-by-leaf-count', role: 'pivot', name: 'Pivot by Leaf Count', grasp: 2, craft: 2, rarity: 'rare', conflicts: ['dp-splits'],
    hosts: ['quick-2way', 'four-end-quicksort'], hook: { pivot: 'leaf' }, effect: 'with BFS Leaf ≤ 5: −27 @100, −334 @500; without it +12 / −89' },
  // order
  { id: 'beam-over-orders', role: 'order', name: 'Beam over Orders', grasp: 4, craft: 6, rarity: 'legendary', requires: ['pick'],
    hosts: ['simple-insertion', 'lis-insertion'], hook: { beam: { W: 16, c: 3 } }, effect: 'Long Line: W = 4 −7 @100, W = 16 −14, W = 64 −19; @500 about −46' },
  { id: 'annealed-plan', role: 'order', name: 'Annealed Plan', grasp: 4, craft: 4, rarity: 'legendary',
    hosts: ['chunks'], hook: { anneal: { budget: 200 } }, effect: 'chunk boundaries on Chunks, 200 trials: −47 @100, −263 @500' },
].map(c => ({ kind: 'technique', requires: [], conflicts: [], ...c }));

export const INSERTION_HOSTS = INS;
