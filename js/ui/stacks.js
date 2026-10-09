// Stacks: named starting stacks to sort, from easy to hard. Easy stacks are tiny or nearly
// sorted, medium stacks are 100 numbers in some shape, hard stacks are 500. Every stack is open,
// and sorting one stamps it. A stack with seeds is a set of inputs (every order of 3, say):
// it is stamped by its worst one, and picking it plays that one.
import { grade } from '../core/metrics.js';

export const LEVELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export const STACKS = [
  { id: 'one', level: 'easy', icon: '1', name: '1 number', n: 1, gen: 'sorted', desc: 'A single number is already sorted. Any move is a fail.', limit: 0 },
  { id: 'two-sorted', level: 'easy', icon: '2', name: '2 in order', n: 2, gen: 'sorted', desc: 'Two numbers, already in order. Any move is a fail.', limit: 0 },
  { id: 'two-swapped', level: 'easy', icon: '⇅', name: '2 swapped', n: 2, gen: 'reversed', desc: 'Two numbers, the wrong way round: exactly one sa.', limit: 1 },
  { id: 'three', level: 'easy', icon: '3', name: '3 numbers, every order', n: 3, gen: 'perm', seeds: range(6), desc: 'All 6 orders of three numbers, stamped by the worst. The subject allows at most 3 moves.', limit: 3 },
  { id: 'five', level: 'easy', icon: '5', name: '5 numbers, every order', n: 5, gen: 'perm', seeds: range(120), desc: 'All 120 orders of five numbers, stamped by the worst. The subject allows at most 12 moves.', limit: 12 },
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
  { id: 'messy50-100', level: 'medium', icon: '½', name: 'Half messy', n: 100, gen: 'disorder', param: 0.5, desc: 'Exactly half of the pairs out of order: random, on average.' },
  { id: 'messy75-100', level: 'medium', icon: '¾', name: 'Three quarters messy', n: 100, gen: 'disorder', param: 0.75, desc: 'Exactly 75 % of the pairs out of order: closer to reversed.' },
  { id: 'random-500', level: 'hard', icon: '✶', name: 'Random 500', n: 500, gen: 'uniform', desc: '500 numbers in random order: the subject’s big test.' },
  { id: 'reversed-500', level: 'hard', icon: '◐', name: 'Reversed 500', n: 500, gen: 'reversed', desc: '500 numbers, largest first.' },
  { id: 'peak-500', level: 'hard', icon: '⋀', name: 'Up then down 500', n: 500, gen: 'organ', desc: '500 numbers climbing up, then falling back down.' },
  { id: 'nearly-500', level: 'hard', icon: '≈', name: 'Nearly sorted 500', n: 500, gen: 'nearly', param: 10, desc: '500 numbers in order, except ten pairs swapped.' },
  { id: 'rotated-500', level: 'hard', icon: '↻', name: 'Rotated 500', n: 500, gen: 'rotated', param: 137, desc: '500 numbers already sorted, but starting in the middle.' },
];
export const SEED = 42;
function range(k) { return Array.from({ length: k }, (_, i) => i); }
const RANDOM = new Set(['uniform', 'nearly', 'disorder', 'nearrev']);   // generators that use the seed
export const stackById = Object.fromEntries(STACKS.map(b => [b.id, b]));

// The stamp a move count earns: a hard limit where the subject sets one, else the grade.
export function stamp(b, ops) {
  if (b.limit != null) return ops <= b.limit ? (b.limit === 0 ? 'PERFECT' : 'PASS') : 'FAIL';
  return grade(b.n, ops).replace('~', '');
}
export const stampClass = s => s === 'PERFECT' ? 'EXCELLENT' : s;
// Plain-words goal for the left panel.
export function goal(b) {
  if (!b) return '';
  if (b.limit === 0) return 'Goal: 0 moves.';
  if (b.limit != null) return `Goal: at most ${b.limit} moves.`;
  return b.n === 100 ? 'Pass under 2 000 · Excellent under 700' : b.n === 500 ? 'Pass under 12 000 · Excellent under 5 500' : '';
}
// The stack matching an input, if any.
export const matchStack = ({ n, gen, param, seed, manual }) => manual ? null
  : STACKS.find(b => b.n === n && b.gen === gen && (b.param == null || +b.param === +param) && (b.seeds ? b.seeds.includes(+seed) : !RANDOM.has(b.gen) || seed === SEED)) || null;
