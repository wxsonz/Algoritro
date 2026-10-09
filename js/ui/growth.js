// The growth ratio as bars (objective §12, the study's visualizer): how many times each hand's
// moves grow when n grows four times, on a log scale from 2× to 32×, with the three classes marked.
// Used by Meta (every card) and the Lab (the hands of a scaling run).
import { el } from './common.js';
import { CLASS_F } from '../core/metrics.js';

// The growth ratio: how many times the moves grow when n grows four times, the class check as one
// number. From 512 to 2048 where both were measured (the graded 500 to 2000, near enough), else
// from 128 to 512, else from 128 to 500 (the slow cards stop there). A class grows by its own
// ratio: n² 16×, n√n 8×, n log n about 4.9× (5.1× from 128). points: [[n, mean ops], ...].
export function growthRatio(points) {
  const at = n => points?.find(p => p[0] === n)?.[1];
  for (const [from, to] of [[512, 2048], [128, 512], [128, 500]]) if (at(from) && at(to)) return { from, to, ratio: at(to) / at(from) };
  return null;
}
export const classRatio = (cls, from, to) => CLASS_F[cls] ? CLASS_F[cls](to) / CLASS_F[cls](from) : null;
// The class whose ratio is nearest, on a log scale.
export function growsLike(ratio, from, to) {
  let best = null, bd = Infinity;
  for (const c of Object.keys(CLASS_F)) { const d = Math.abs(Math.log(ratio / classRatio(c, from, to))); if (d < bd) { bd = d; best = c; } }
  return best;
}

const LO = Math.log(2), HI = Math.log(32), X = r => Math.max(0, Math.min(100, 100 * (Math.log(r) - LO) / (HI - LO)));
const COLOR = { 'n log n': 'var(--f-complex)', 'n√n': 'var(--f-medium)', 'n²': 'var(--f-simple)' };
const NAME = { 'n log n': 'O(n log n)', 'n√n': 'O(n√n)', 'n²': 'O(n²)' };
// rows: { name, href, ratio, from, to, cls (the claimed class) }
export function growthBars(rows) {
  const marks = [['n log n', 'n log n'], ['n√n', 'n√n'], ['n²', 'n²']].map(([c, t]) => [classRatio(c, 512, 2048), t]);
  const axis = el('div.grow-axis', {}, el('div'), el('div', {}, marks.map(([r, t]) => el('span', { style: { left: X(r) + '%' } }, `${t} ${r.toFixed(r < 10 ? 1 : 0)}×`))), el('div'));
  return el('div.growth', { role: 'list' }, axis, rows.map(r => {
    const like = growsLike(r.ratio, r.from, r.to), claim = classRatio(r.cls, r.from, r.to);
    const over = claim != null && r.ratio > claim * 1.12;
    const tip = `${r.name}: ×${r.ratio.toFixed(2)} from n=${r.from} to n=${r.to}\nGrows like ${NAME[like]}` + (claim ? `; its claim, ${NAME[r.cls]}, grows ×${claim.toFixed(2)}${over ? ': faster than its claim' : ''}` : '');
    return el('div.grow-row', { role: 'listitem', title: tip },
      el(r.href ? 'a.grow-name' : 'span.grow-name', r.href ? { href: r.href } : {}, r.name),
      el('div.grow-bar', {}, el('i', { style: { width: X(r.ratio) + '%', '--c': COLOR[like] } }), marks.map(([m]) => el('span.mark', { style: { left: X(m) + '%' } }))),
      el('b', { className: 'grow-val' + (over ? ' bad' : '') }, `×${r.ratio.toFixed(1)}${over ? ' ⚑' : ''}`));
  }));
}
