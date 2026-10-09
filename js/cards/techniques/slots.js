// Technique cards for the slot roles. Each slot role holds one card per hand (spec/04).
// `hook` is merged into the options the host's engine reads; `hosts` lists the Algorithm cards
// the card is built for, so any other host with the role open shows it as an open space.
import { lisKeep, circKeep, runKeep } from '../lib.js';

const INS = ['simple-insertion', 'lis-insertion', 'turk', 'insert-into-b', 'lookahead-greedy'];

export default [
  // anchor
  { id: 'lis-anchor', role: 'anchor', name: 'LIS Anchor', tagline: 'Keep the longest ordered line', knows: ['lis'], fns: 3, from: "counted: claude-opus-5.5-high lis.c (lower_bound, lis_build, lis_mark)", rarity: 'rare',
    hosts: ['simple-insertion', 'turk', 'insert-into-b', 'lookahead-greedy'], hook: { keep: lisKeep },
    effect: 'Simple Insertion −65 @100, −366 @500; on Turk −9 / +49' },
  { id: 'circular-lis-anchor', role: 'anchor', name: 'Circular LIS Anchor', tagline: 'The line can wrap around', knows: ['lis',  'rotdist'], fns: 5, from: "counted: claude-opus-5.5-max lis.c (4) and simple.c's load_circ", rarity: 'rare',
    hosts: ['simple-insertion', 'turk', 'insert-into-b', 'lookahead-greedy'], hook: { keep: circKeep },
    effect: 'LIS host −6 @100, −17 @500; on Turk −13 / +45' },
  { id: 'longest-run-anchor', role: 'anchor', name: 'Longest Run Anchor', tagline: 'Keep the longest contiguous ordered block', knows: [], fns: 1, from: "est.: one scan for the longest ascending stretch", rarity: 'uncommon',
    hosts: ['simple-insertion', 'turk', 'insert-into-b', 'lookahead-greedy'], hook: { keep: runKeep },
    effect: 'Simple Insertion + Cheapest Pick −7 @100, −20 @500; on Turk +20 / +83' },
  { id: 'keep-three', role: 'anchor', name: 'Keep Three', tagline: 'Leave three, sort them by hand', knows: [], fns: 0, from: "est.: a loop bound; the Finisher does the work", rarity: 'common',
    hosts: ['turk', 'lookahead-greedy', 'min-extract'], hook: { keep: null },
    effect: 'Turk default, Min Extract native' },
  // pick
  { id: 'cheapest-pick', role: 'pick', name: 'Cheapest Pick', tagline: 'Look at everyone before moving', knows: ['greedy'], fns: 2, from: "counted: gemini-flash-3.8 sort_complex.c and sort_complex_utils.c (pick_best_combo, push_cheapest_a_to_b)", rarity: 'common',
    hosts: ['simple-insertion', 'insert-into-b'], hook: { pick: 'cheapest' },
    effect: 'LIS host −850 @100 (1397 → 547); alone on Simple Insertion −874' },
  // cost
  { id: 'two-way-cost', role: 'cost', name: 'Two-Way Cost', knows: ['rotdist',  'shared'], fns: 2, from: "counted: claude-opus-5.5-high rotate.c (rot_cost, move_cost)", rarity: 'common',
    hosts: ['simple-insertion', 'lis-insertion', 'turk', 'insert-into-b', 'bucket-insertion'], hook: { cost: 2, look: 0 },
    effect: 'baseline for Cheapest Pick' },
  { id: 'four-way-cost', role: 'cost', name: 'Four-Way Cost', tagline: 'Price all four ways', knows: ['rotdist',  'shared'], fns: 2, from: "counted: gemini-flash-3.8 sort_complex_utils.c (calc_cost_ab, execute_dual_rot)", rarity: 'common', requires: ['pick'],
    hosts: ['simple-insertion', 'lis-insertion', 'turk', 'insert-into-b', 'bucket-insertion'], hook: { cost: 4, look: 0 },
    effect: 'LIS host −4 @100, −19 @500; Turk −4 / −19' },
  { id: 'lookahead-k', role: 'cost', name: 'Lookahead-k', tagline: 'Price the move after next', knows: ['heuristic'], fns: 3, from: "est.: pricing each candidate one move deeper, and its loop", rarity: 'rare', requires: ['pick'], lesson: true,
    hosts: ['simple-insertion', 'lis-insertion', 'turk', 'insert-into-b'], hook: { cost: 4, look: 3 },
    effect: 'worse: Turk −2 @100, +175 @500; Long Line +25 / +297' },
  // band
  { id: 'rb-sink', role: 'band', name: '`rb` Sink (Two Bands)', short: 'rb Sink', tagline: 'Low ones to the floor', knows: ['ranges'], fns: 1, from: "counted: the explorer's reference build chunks.c (push_member)", rarity: 'uncommon',
    hosts: ['simple-insertion', 'lis-insertion', 'chunks', 'bucket-insertion', 'butterfly'], hook: { bands: 2, band: 'sink' },
    effect: 'LIS host −14 @100, −93 @200, −616 @500' },
  { id: 'multi-band', role: 'band', name: 'Multi-Band', tagline: 'More floors', knows: ['ranges'], fns: 2, from: "est.: a value's band, and the sink-or-keep decision", rarity: 'rare', unbuildable: 'B has only two cheap ends, so a third band has nowhere to go. Its measurable part is rb Sink\'s split point.',
    hosts: [], hook: {}, effect: 'not buildable as written' },
  { id: 'sb-seed', role: 'band', name: '`sb` Seed', short: 'sb Seed', knows: [], fns: 1, from: "est.: one check after each push", rarity: 'uncommon', lesson: true,
    hosts: ['turk', 'lookahead-greedy'], hook: { sbSeed: true }, effect: 'Turk +0.3: the sb costs more than it saves' },
  { id: 'middle-out-push', role: 'band', name: 'Middle-Out Push', knows: ['ranges'], fns: 1, from: "est.: the chunk order, from the middle out", rarity: 'uncommon', lesson: true,
    hosts: ['chunks', 'bucket-insertion'], hook: { band: 'middle', bands: 1 }, effect: 'Chunks +141 @100, +1794 @500 instead of rb Sink' },
  // sweep
  { id: 'nearest-member-sweep', role: 'sweep', name: 'Nearest-Member Sweep', knows: ['rotdist'], fns: 1, from: "est.: the nearest member, looked for from both ends", rarity: 'common',
    hosts: ['chunks', 'bucket-insertion'], hook: { sweep: 'nearest' }, effect: 'Chunks +16 @100, +140 @500 vs One-Way',
    breaksClass: 'n√n', breaksWhy: 'it can pass the same value many times, so the O(n√n) argument no longer holds (the study cites Rosenkrantz, Stearns and Lewis)' },
  { id: 'one-way-sweep', role: 'sweep', name: 'One-Way Sweep', tagline: 'Pass each value once', knows: ['rotdist'], fns: 1, from: "counted: the explorer's reference build chunks.c (sweep_forward) and claude-opus-5.5-high medium.c (sweep_up)", rarity: 'rare',
    hosts: ['chunks', 'bucket-insertion'], hook: { sweep: 'oneway' }, effect: 'Chunks −16 @100, −140 @500 vs Nearest-Member; gives the n√n proof' },
  // retrieval
  { id: 'max-retrieval', role: 'retrieval', name: 'Max Retrieval', knows: ['rotdist'], fns: 2, from: "counted: gpt-6-sol-high sort_utils.c (find_max, bring_top)", rarity: 'common',
    hosts: ['chunks', 'butterfly'], hook: { ret: 'max' }, effect: 'baseline for buckets' },
  { id: 'second-max-lookahead', role: 'retrieval', name: 'Second-Max Lookahead', short: 'Second-Max', tagline: 'Grab the runner-up on the way', knows: ['rotdist',  'greedy'], fns: 3, from: "counted: the explorer's reference build retrieve.c (dist, argmax_b, retrieve_second); it replaces Max Retrieval", rarity: 'uncommon',
    requires: [{ role: 'retrieval', hostDefault: 'max-retrieval' }],
    hosts: ['chunks', 'butterfly'], hook: { ret: 'second' }, effect: 'Chunks −26 @100, −385 @500; Butterfly −19 / −279' },
  { id: 'rank-range-max', role: 'retrieval', name: 'Rank-Range Max', knows: ['ranges'], fns: 2, from: "est.: the next expected rank, and bringing it up", rarity: 'uncommon',
    hosts: ['chunks', 'butterfly'], hook: { ret: 'rank' }, effect: '0 by construction: a correctness and CPU fix' },
  { id: 'cheapest-return', role: 'retrieval', name: 'Cheapest Return', tagline: 'Turk on the way back', knows: ['greedy',  'slot'], fns: 2, uses: ['insert-core'], from: "est.: the pick and the return loop, on the insertion core", rarity: 'rare',
    hosts: ['chunks', 'butterfly'], hook: { ret: 'cheapest' }, effect: 'Chunks +21 @100, −494 @500' },
  // ends
  { id: 'four-ends', role: 'ends', name: 'Four Ends', knows: ['rotdist'], fns: 4, from: "counted: claude-opus-5.5-high quick.c (loc_dest) and quick_loc.c (loc_peek, loc_norm, loc_move)", rarity: 'rare',
    hosts: ['quick-2way'], hook: { fourEnds: true }, effect: 'vs Quick 2-Way, both with 2-value leaves: +6 @100, −355 @500' },
  { id: 'restore-skip', role: 'ends', name: 'Restore Skip', knows: [], fns: 1, from: "est.: one check before each restore", rarity: 'uncommon',
    hosts: ['quick-2way'], hook: { skipWhole: true }, effect: 'the whole-stack case is in the bare Quick 2-Way (−139 / −732 vs always restoring)' },
  // split
  { id: 'thirds-split', role: 'split', name: 'Thirds Split', tagline: 'Three-way partition', knows: ['partition'], fns: 1, from: "counted: claude-opus-5.5-high quick.c (split)", rarity: 'rare',
    requires: [{ role: 'ends', card: 'four-ends' }], conflicts: ['median-pivot'],
    hosts: ['quick-2way', 'four-end-quicksort'], hook: { parts: 3 }, effect: 'given Four Ends, no Finisher: −86 @100, −330 @500' },
  { id: 'dp-splits', role: 'split', name: 'DP Splits', tagline: 'Plan every split in advance', knows: ['dp'], fns: 24, from: "counted: claude-opus-5.5-max dp.c (5), dp_climb.c (2), dp_cost.c (4), dp_leaf.c (4), dp_search.c (4), dp_settle.c (5)", rarity: 'legendary',
    requires: [{ role: 'ends', card: 'four-ends' }], conflicts: ['median-pivot', 'pivot-by-leaf-count'],
    hosts: ['quick-2way', 'four-end-quicksort'], hook: { dp: true }, effect: 'vs Pivot by Leaf Count, BFS Leaf ≤ 5: −17 @100, −214 @500' },
  // pivot
  { id: 'median-pivot', role: 'pivot', name: 'Median Pivot', knows: [], fns: 0, from: "est.: the middle rank of the range, one line", rarity: 'common', conflicts: ['thirds-split', 'dp-splits'],
    hosts: ['quick-2way', 'four-end-quicksort'], hook: { pivot: 'equal', parts: 2 }, effect: 'Quick 2-Way baseline' },
  { id: 'pivot-by-leaf-count', role: 'pivot', name: 'Pivot by Leaf Count', knows: [], fns: 1, from: "counted: claude-opus-5.5-high quick.c (pivots)", rarity: 'rare', conflicts: ['dp-splits'],
    hosts: ['quick-2way', 'four-end-quicksort'], hook: { pivot: 'leaf' }, effect: 'with BFS Leaf ≤ 5: −27 @100, −334 @500; without it +12 / −89' },
  // order
  { id: 'beam-over-orders', role: 'order', name: 'Beam over Orders', knows: ['beam',  'heuristic'], fns: 13, from: "counted: claude-opus-5.5-max ins_beam.c (4), ins_apply.c (5), ins_mem.c (4)", rarity: 'legendary', requires: ['pick'],
    hosts: ['simple-insertion', 'lis-insertion'], hook: { beam: { W: 16, c: 3 } }, effect: 'Long Line: W = 4 −7 @100, W = 16 −14, W = 64 −19; @500 about −46' },
  { id: 'annealed-plan', role: 'order', name: 'Annealed Plan', knows: ['anneal'], fns: 10, from: "counted: the explorer's reference build anneal.c (5), anneal_mem.c (2), and util.c's exponential and random draws (3)", rarity: 'legendary',
    hosts: ['chunks'], hook: { anneal: { budget: 200 } }, effect: 'chunk boundaries on Chunks, 200 trials: −47 @100, −263 @500' },
].map(c => ({ kind: 'technique', requires: [], conflicts: [], ...c }));

export const INSERTION_HOSTS = INS;
