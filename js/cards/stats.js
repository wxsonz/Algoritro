// Grasp and Craft (spec/03 §3.2). Grasp is the prior knowledge a card needs: the concepts you
// must know before it makes sense, each with a weight. Craft is the code it takes under the Norm,
// in functions (at most 25 lines and 4 parameters each, 5 to a file), counted from real C where a
// study build or a reference build has it, estimated where none does. Both add up as sets: a
// concept learnt once, or code written once, counts once in a hand or a build. Every card's
// concepts and functions, with their sources, are in spec/grasp-craft.md (tools/grasp-craft.mjs).

// The free base, worth nothing: the two stacks, the 11 moves, loops and arrays.
export const CONCEPTS = {
  rank: { name: 'rank compression', w: 1 },
  disorder: { name: 'disorder: inversions over pairs', w: 1 },
  rotdist: { name: 'rotation distance (ra against rra)', w: 1 },
  greedy: { name: 'greedy "cheapest first"', w: 1 },
  ranges: { name: 'ranges and chunks by rank', w: 1 },
  slot: { name: 'target slot in a circular sorted stack', w: 2 },
  shared: { name: 'shared rotations (rr, rrr) in a cost', w: 2 },
  algebra: { name: 'move algebra (peephole rewrites)', w: 2 },
  heuristic: { name: 'heuristics: what makes a good guess', w: 2 },
  recursion: { name: 'recursion', w: 2 },
  partition: { name: 'partition around a pivot', w: 2 },
  digits: { name: 'digits in a base, bit tests', w: 2 },
  merge: { name: 'merging sorted runs', w: 2 },
  lis: { name: 'longest increasing subsequence', w: 3 },
  dp: { name: 'dynamic programming', w: 3 },
  bfs: { name: 'graph search (BFS)', w: 3 },
  beam: { name: 'beam or A* search', w: 3 },
  anneal: { name: 'simulated annealing, randomness', w: 3 },
};

// Code that more than one card uses, counted once in a hand or a build.
export const SHARED = {
  disorder: { name: 'the disorder count', fns: 2, from: 'counted: gpt-6-sol-high disorder.c (compute_disorder, select_strategy) and gemini-flash-3.8 disorder.c, 2 each' },
  'insert-core': { name: 'insertion core: the slot in A, rotations with rr and rrr, the insertion loop', fns: 4, from: 'counted: claude-opus-5.5-high insert.c (a_slot, insert_back) and rotate.c (rot_one, exec_rot)' },
  'quick-core': { name: 'two-way partition between the stacks, with restores', fns: 4, from: 'est.: an A-to-B pass, a B-to-A pass, a restore and an entry, on the pattern of claude-opus-5.5-high quick.c' },
  'bfs-core': { name: 'BFS over stack states, with a hash set', fns: 13, from: 'counted: claude-opus-5.5-high leaf_bfs.c (4), leaf_hash.c (5) and leaf_model.c (4)' },
  tables: { name: 'exact distance tables of 4-value groups', fns: 21, from: 'counted: claude-opus-5.5-max tbl_avg.c, tbl_build.c, tbl_index.c, tbl_init.c and tbl_pack.c (16), and leaf.c (5)' },
};

// The base kit every push_swap needs, whatever its cards: parsing and errors, ranks, the two
// stacks, the 11 moves and their output, freeing, the flags and main, and the disorder count the
// selector reads.
export const KIT = {
  fns: 28, uses: ['disorder'], knows: ['disorder'],
  from: 'counted: 27 in the explorer\'s reference builds without flags or disorder (study/explorer-refs: parse.c, rank.c, stack.c, ops.c, machine.c, ref_main.c), 31 in gpt-6-sol-high with both, 43 in claude-opus-5.5-high with a --bench readout; 30 with the disorder count',
};

// The kit's functions, its share of the disorder count included.
export const KIT_FNS = KIT.fns + KIT.uses.reduce((s, k) => s + SHARED[k].fns, 0);
// A build burns past these. A classic build (Min Extract, Chunks, LSD Radix) is Grasp 9 and Craft
// 58: Grasp 20 is that plus about four heavy ideas, Craft 100 is about twenty files under the Norm.
export const FIRE = { grasp: 20, craft: 100 };

// The Grasp and Craft of a set of cards: the union of their concepts and code. find(id) looks up
// the cards a card brings along (brings: a Finisher it always uses, say).
export function tally(cards, { kit = false, find = () => null } = {}) {
  const concepts = new Set(), shared = new Set(), seen = new Map();
  const add = c => {
    if (!c || seen.has(c.id)) return;
    seen.set(c.id, c);
    for (const k of c.knows || []) concepts.add(k);
    for (const s of c.uses || []) shared.add(s);
    for (const id of c.brings || []) add(find(id));
  };
  for (const c of cards) add(c);
  if (kit) { for (const k of KIT.knows) concepts.add(k); for (const s of KIT.uses) shared.add(s); }
  const own = [...seen.values()].reduce((s, c) => s + (c.fns || 0), 0) + (kit ? KIT.fns : 0);
  return {
    grasp: [...concepts].reduce((s, k) => s + CONCEPTS[k].w, 0),
    craft: own + [...shared].reduce((s, k) => s + SHARED[k].fns, 0),
    concepts: [...concepts].sort((a, b) => CONCEPTS[b].w - CONCEPTS[a].w || a.localeCompare(b)),
    shared: [...shared], cards: [...seen.keys()],
  };
}
// "LIS (3), slot (2)": a concept list for tooltips and the spec.
export const conceptWords = ks => ks.map(k => `${CONCEPTS[k].name} (${CONCEPTS[k].w})`).join(', ');
