// Stacks: named starting stacks to sort, from easy to hard. Easy stacks are tiny or nearly
// sorted, medium stacks are 100 numbers in some shape, hard stacks are 500. Every stack is open,
// and sorting one stamps it. A stack with seeds is a set of inputs (every order of 3, say):
// it is stamped by its worst one, and picking it plays that one.
import { grade } from '../core/metrics.js';
import { generate, ranks } from '../core/input.js';
import { routeOf } from '../core/meta-run.js';

export const LEVELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export const STACKS = [
  { id: 'one', level: 'easy', icon: '1', name: '1 number', n: 1, gen: 'sorted', desc: 'A single number is already sorted. Any move is a fail.', limit: 0 },
  { id: 'two-sorted', level: 'easy', icon: '2', name: '2 in order', n: 2, gen: 'sorted', desc: 'Two numbers, already in order. Any move is a fail.', limit: 0 },
  { id: 'two-swapped', level: 'easy', icon: '⇅', name: '2 swapped', n: 2, gen: 'reversed', desc: 'Two numbers, the wrong way round: exactly one sa.', limit: 1, best: 1 },
  { id: 'three', level: 'easy', icon: '3', name: '3 numbers, every order', n: 3, gen: 'perm', seeds: range(6), desc: 'All 6 orders of three numbers, stamped by the worst. The subject allows at most 3 moves.', limit: 3, best: 2 },
  { id: 'four', level: 'easy', icon: '4', name: '4 numbers, every order', n: 4, gen: 'perm', seeds: range(24), desc: 'All 24 orders of four numbers, stamped by the worst. The subject\'s rule for five or fewer allows 12 moves; 5 is the best possible.', limit: 12, best: 5 },
  { id: 'five', level: 'easy', icon: '5', name: '5 numbers, every order', n: 5, gen: 'perm', seeds: range(120), desc: 'All 120 orders of five numbers, stamped by the worst. The subject allows at most 12 moves.', limit: 12, best: 8 },
  { id: 'six', level: 'easy', icon: '6', name: '6 numbers, every order', n: 6, gen: 'perm', seeds: range(720), desc: 'All 720 orders of six numbers, stamped by the worst. The subject sets no limit here; the line is twice the best possible, 10.', limit: 20, best: 10 },
  { id: 'sorted', level: 'easy', icon: '✓', name: 'Already sorted', n: 100, gen: 'sorted', desc: 'Nothing to do. Any move at all is a fail.', limit: 0 },
  { id: 'one-swap', level: 'easy', icon: '⇄', name: 'One swap', n: 100, gen: 'nearly', param: 1, desc: 'Sorted, except one pair swapped.' },
  { id: 'nearly', level: 'easy', icon: '≈', name: 'Nearly sorted', n: 100, gen: 'nearly', param: 3, desc: 'Sorted, except three pairs swapped.' },
  { id: 'smallest-last', level: 'easy', icon: '⤓', name: 'Smallest at the bottom', n: 100, gen: 'rotated', param: 1, desc: 'Sorted, but the smallest number sits at the bottom: one rra fixes it.' },
  { id: 'random-100', level: 'medium', icon: '✶', name: 'Random 100', n: 100, gen: 'uniform', desc: '100 numbers in random order: the subject’s main test.' },
  { id: 'reversed-100', level: 'medium', icon: '◐', name: 'Reversed 100', n: 100, gen: 'reversed', desc: 'Largest first: every number starts in the wrong place.' },
  { id: 'rotated-100', level: 'medium', icon: '↻', name: 'Rotated 100', n: 100, gen: 'rotated', param: 37, desc: 'Already sorted, but it starts in the middle.' },
  { id: 'peak-100', level: 'medium', icon: '⋀', name: 'Up then down', n: 100, gen: 'organ', desc: 'Climbs up, then falls back down.' },
  { id: 'runs-100', level: 'medium', icon: '⩘', name: 'Four runs', n: 100, gen: 'sawtooth', param: 4, desc: 'Four sorted runs, one after another.' },
  { id: 'valley-100', level: 'medium', icon: '⋁', name: 'Down then up', n: 100, gen: 'valley', desc: 'Falls down, then climbs back up: Up then down, upside down.' },
  { id: 'interleave-100', level: 'medium', icon: '⫘', name: 'Interleaved halves', n: 100, gen: 'interleave', desc: '0, 50, 1, 51, 2, 52…: hard for cards that move numbers in chunks.' },
  { id: 'nearrev-100', level: 'medium', icon: '◑', name: 'Nearly reversed', n: 100, gen: 'nearrev', param: 3, desc: 'Largest first, except three pairs swapped.' },
  { id: 'runs20-100', level: 'medium', icon: '≋', name: 'Twenty runs', n: 100, gen: 'sawtooth', param: 20, desc: 'Twenty short sorted runs, one after another.' },
  { id: 'messy25-100', level: 'medium', icon: '¼', name: 'A quarter messy', n: 100, gen: 'disorder', param: 0.25, desc: 'Exactly 25 % of the pairs out of order.' },
  { id: 'local25-100', level: 'medium', icon: '⁓', name: 'A quarter messy, local', n: 100, gen: 'local', param: 0.25, desc: 'Exactly 25 % of the pairs out of order, by swaps of neighbours: every number stays near its place. The push_swap visualizer\'s "local" shape.' },
  { id: 'messy50-100', level: 'medium', icon: '½', name: 'Half messy', n: 100, gen: 'disorder', param: 0.5, desc: 'Exactly half of the pairs out of order: random, on average.' },
  { id: 'messy75-100', level: 'medium', icon: '¾', name: 'Three quarters messy', n: 100, gen: 'disorder', param: 0.75, desc: 'Exactly 75 % of the pairs out of order: closer to reversed.' },
  { id: 'random-500', level: 'hard', icon: '✶', name: 'Random 500', n: 500, gen: 'uniform', desc: '500 numbers in random order: the subject’s big test.' },
  { id: 'reversed-500', level: 'hard', icon: '◐', name: 'Reversed 500', n: 500, gen: 'reversed', desc: '500 numbers, largest first.' },
  { id: 'peak-500', level: 'hard', icon: '⋀', name: 'Up then down 500', n: 500, gen: 'organ', desc: '500 numbers climbing up, then falling back down.' },
  { id: 'nearly-500', level: 'hard', icon: '≈', name: 'Nearly sorted 500', n: 500, gen: 'nearly', param: 10, desc: '500 numbers in order, except ten pairs swapped.' },
  { id: 'rotated-500', level: 'hard', icon: '↻', name: 'Rotated 500', n: 500, gen: 'rotated', param: 137, desc: '500 numbers already sorted, but starting in the middle.' },
];
export const SEED = 1000;   // the default global seed: the study's first, so Random 100 is its first graded input
function range(k) { return Array.from({ length: k }, (_, i) => i); }
const RANDOM = new Set(['uniform', 'nearly', 'disorder', 'local', 'nearrev']);   // generators that use the seed
// A stack the global seed changes: a seeded shape that is not a fixed set of orders.
export const seeded = b => RANDOM.has(b.gen) && !b.seeds;
export const stackById = Object.fromEntries(STACKS.map(b => [b.id, b]));
// A stack's input at a seed; a set of orders gives its first.
export const stackRanks = (b, seed = SEED) => ranks(generate(b.gen, b.n, b.seeds ? b.seeds[0] : seed, b.param));
// Where a stack goes. A set of orders is tiny by its size, whatever each order's disorder.
export function stackRoute(b, seed = SEED) { const r = routeOf(stackRanks(b, seed)); return b.seeds ? { d: null, route: r.route } : r; }

// The stamp a move count earns: the grade, or, where the subject sets a hard limit, a grade of
// its own. best is the optimum (the worst order's shortest solution, by the Oracle's search):
// EXCELLENT reaches it, GOOD gets at least halfway from the limit to it, PASS stays within the limit.
export function stamp(b, ops) {
  if (b.limit != null) {
    if (ops > b.limit) return 'FAIL';
    if (b.limit === 0) return 'PERFECT';
    const best = b.best ?? b.limit;
    return ops <= best ? 'EXCELLENT' : ops <= (best + b.limit) / 2 ? 'GOOD' : 'PASS';
  }
  return grade(b.n, ops).replace('~', '');
}
export const stampClass = s => s === 'PERFECT' ? 'EXCELLENT' : s;
// Plain-words goal for the left panel.
export function goal(b) {
  if (!b) return '';
  if (b.limit === 0) return 'Goal: 0 moves.';
  if (b.limit != null) return `Goal: at most ${b.limit} moves${b.best != null && b.best < b.limit ? ` · Best possible: ${b.best}` : ''}.`;
  return b.n === 100 ? 'Pass under 2 000 · Excellent under 700' : b.n === 500 ? 'Pass under 12 000 · Excellent under 5 500' : '';
}
// The stack matching an input, if any: a seeded stack only at the global seed.
export const matchStack = ({ n, gen, param, seed, manual }, gseed = SEED) => manual ? null
  : STACKS.find(b => b.n === n && b.gen === gen && (b.param == null || +b.param === +param) && (b.seeds ? b.seeds.includes(+seed) : !RANDOM.has(b.gen) || +seed === +gseed)) || null;
