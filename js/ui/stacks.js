// Stacks: named starting stacks to sort, from easy to hard. Easy stacks are tiny or nearly
// sorted, medium stacks are 100 numbers in some shape, hard stacks are 500. Every stack is open,
// and sorting one stamps it.
import { grade } from '../core/metrics.js';

export const LEVELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export const STACKS = [
  { id: 'sorted', level: 'easy', icon: '✓', name: 'Already sorted', n: 100, gen: 'sorted', desc: 'Nothing to do. Any move at all is a fail.', limit: 0 },
  { id: 'one-swap', level: 'easy', icon: '⇄', name: 'One swap', n: 100, gen: 'nearly', param: 1, desc: 'Sorted, except one pair swapped.' },
  { id: 'nearly', level: 'easy', icon: '≈', name: 'Nearly sorted', n: 100, gen: 'nearly', param: 3, desc: 'Sorted, except three pairs swapped.' },
  { id: 'three', level: 'easy', icon: '3', name: '3 numbers', n: 3, gen: 'reversed', desc: 'Three numbers, backwards. The subject allows at most 3 moves.', limit: 3 },
  { id: 'five', level: 'easy', icon: '5', name: '5 numbers', n: 5, gen: 'uniform', desc: 'Five numbers. The subject allows at most 12 moves.', limit: 12 },
  { id: 'random-100', level: 'medium', icon: '✶', name: 'Random 100', n: 100, gen: 'uniform', desc: '100 numbers in random order: the subject’s main test.' },
  { id: 'reversed-100', level: 'medium', icon: '◐', name: 'Reversed 100', n: 100, gen: 'reversed', desc: 'Largest first: every number starts in the wrong place.' },
  { id: 'rotated-100', level: 'medium', icon: '↻', name: 'Rotated 100', n: 100, gen: 'rotated', param: 37, desc: 'Already sorted, but it starts in the middle.' },
  { id: 'peak-100', level: 'medium', icon: '⋀', name: 'Up then down', n: 100, gen: 'organ', desc: 'Climbs up, then falls back down.' },
  { id: 'runs-100', level: 'medium', icon: '⩘', name: 'Four runs', n: 100, gen: 'sawtooth', param: 4, desc: 'Four sorted runs, one after another.' },
  { id: 'random-500', level: 'hard', icon: '✶', name: 'Random 500', n: 500, gen: 'uniform', desc: '500 numbers in random order: the subject’s big test.' },
  { id: 'reversed-500', level: 'hard', icon: '◐', name: 'Reversed 500', n: 500, gen: 'reversed', desc: '500 numbers, largest first.' },
  { id: 'peak-500', level: 'hard', icon: '⋀', name: 'Up then down 500', n: 500, gen: 'organ', desc: '500 numbers climbing up, then falling back down.' },
];
export const SEED = 42;
const RANDOM = new Set(['uniform', 'nearly', 'disorder']);   // generators that use the seed
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
  : STACKS.find(b => b.n === n && b.gen === gen && (b.param == null || +b.param === +param) && (!RANDOM.has(b.gen) || seed === SEED)) || null;
