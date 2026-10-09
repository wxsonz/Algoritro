export function eq(a, b, msg = '') { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
export function ok(c, msg = 'assertion failed') { if (!c) throw new Error(msg); }
export function* perms(n) { const p = [...Array(n).keys()]; function* g(i) { if (i === n) { yield p.slice(); return; } for (let j = i; j < n; j++) { [p[i], p[j]] = [p[j], p[i]]; yield* g(i + 1); [p[i], p[j]] = [p[j], p[i]]; } } yield* g(0); }
import { runHand } from '../js/core/hand.js';
import { generate, ranks } from '../js/core/input.js';
// Play a bare card or a hand on ranks.
export const play = (algo, r, techs = [], extra = {}) => runHand({ algo, techs, sandbox: true, sharing: true, ...extra }, r, { keepSteps: false });
export const uniform = (n, s) => ranks(generate('uniform', n, s));
export const meanOps = (hand, n, k, seed0 = 1) => { let s = 0; for (let i = 0; i < k; i++) s += runHand(hand, uniform(n, seed0 + i), { keepSteps: false }).ops.length; return s / k; };
export const near = (x, ref, tol = 0.05, msg = '') => ok(Math.abs(x - ref) / ref <= tol, `${msg} ${x.toFixed(1)} is not within ${tol * 100} % of ${ref}`);
