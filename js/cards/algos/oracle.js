// Oracle: breadth-first search over (A, B) states with the 11 ops. The first time the sorted state
// is reached, the path is a shortest stream. There are (n+1)·n! states, so n ≤ 8.
import { OPS } from '../../core/machine.js';

function step(a, b, o) {
  a = a.slice(); b = b.slice();
  const sw = s => { if (s.length > 1) { const t = s[0]; s[0] = s[1]; s[1] = t; } }, r = s => { if (s.length > 1) s.push(s.shift()); }, rr = s => { if (s.length > 1) s.unshift(s.pop()); };
  switch (o) {
    case 'sa': sw(a); break; case 'sb': sw(b); break; case 'ss': sw(a); sw(b); break;
    case 'pa': if (b.length) a.unshift(b.shift()); break; case 'pb': if (a.length) b.unshift(a.shift()); break;
    case 'ra': r(a); break; case 'rb': r(b); break; case 'rr': r(a); r(b); break;
    case 'rra': rr(a); break; case 'rrb': rr(b); break; case 'rrr': rr(a); rr(b); break;
  }
  return [a, b];
}
// Pack a state into a number: base 11, digits rank+1, with n+1 as the A/B separator.
const key = (a, b, n) => { let k = 0; for (const x of a) k = k * 11 + x + 1; k = k * 11 + n + 1; for (const x of b) k = k * 11 + x + 1; return k; };

export function shortest(ranks) {
  const n = ranks.length, goal = key([...Array(n).keys()], [], n);
  const start = key(ranks, [], n); if (start === goal) return [];
  const prev = new Map([[start, null]]); let frontier = [[ranks.slice(), []]];
  while (frontier.length) {
    const next = [];
    for (const [a, b] of frontier) for (const o of OPS) {
      const [a2, b2] = step(a, b, o), k2 = key(a2, b2, n);
      if (prev.has(k2)) continue;
      prev.set(k2, [key(a, b, n), o]);
      if (k2 === goal) { const path = []; for (let k = k2; prev.get(k); k = prev.get(k)[0]) path.push(prev.get(k)[1]); return path.reverse(); }
      next.push([a2, b2]);
    }
    frontier = next;
  }
  throw new Error('goal not reachable');
}
// Backward BFS from the sorted state: the optimum of every input of size n at once (the ops are
// their own inverses as a set, so distances to the goal equal distances from it).
export function distanceTable(n) {
  const goal = [[...Array(n).keys()], []], dist = new Map([[key(goal[0], [], n), 0]]); let frontier = [goal], d = 0;
  while (frontier.length) { const next = []; for (const [a, b] of frontier) for (const o of OPS) { const [a2, b2] = step(a, b, o), k = key(a2, b2, n); if (!dist.has(k)) { dist.set(k, d + 1); next.push([a2, b2]); } } frontier = next; d++; }
  return { size: dist.size, of: ranks => dist.get(key(ranks, [], n)) };
}
export default {
  id: 'oracle', kind: 'algorithm', family: 'small', name: 'Oracle', tagline: 'Sees every future',
  rarity: 'rare', claimedClass: 'exponential', proof: 'yes', grasp: 4, craft: 6, lines: 200, slots: 0, maxN: 8, playsAs: 'bfs-leaf', speed: 'n ≤ 8',
  run(m) {
    m.phase('search');
    for (const o of shortest(m.a)) m.why('a shortest stream, found by breadth-first search').op(o);
  },
};
