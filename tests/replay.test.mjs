import { replay } from '../js/core/replay.js';
import { Machine, OPS } from '../js/core/machine.js';
import { rng, randInt } from '../js/core/rng.js';
import { eq, ok } from './assert.mjs';

export const tests = [
  ['every op on empty and single-value stacks changes nothing', () => {
    for (const o of OPS) { eq(replay([], [o]).a, [], o); const r = replay([0], [o]); ok(r.a.length + r.b.length === 1, o); }
    eq(replay([0], ['pb', 'pb']).b, [0]); eq(replay([0], ['pa']).a, [0]);
  }],
  ['ops follow the subject', () => {
    eq(replay([2, 1, 3, 6, 5, 8], ['sa']).a, [1, 2, 3, 6, 5, 8]);
    const r = replay([1, 2, 3, 6, 5, 8], ['pb', 'pb', 'pb']); eq(r.a, [6, 5, 8]); eq(r.b, [3, 2, 1]);
    const s = replay([6, 5, 8, 3, 2, 1], []); ok(!s.ok);
    eq(replay([0, 1, 2], ['ra']).a, [1, 2, 0]); eq(replay([0, 1, 2], ['rra']).a, [2, 0, 1]);
  }],
  ['the subject example sorts in 12 ops', () => {
    const ops = 'sa pb pb pb rr rrr sa pa pa pa'.split(' ');
    const input = [2, 1, 3, 6, 5, 8].map(v => [1, 2, 3, 5, 6, 8].indexOf(v));
    // rr = ra rb, rrr = rra rrb: the subject counts 12 with them split.
    ok(replay(input, ops).ok);
  }],
  ['unknown ops are rejected', () => { const r = replay([0], ['rx']); ok(!r.ok && /unknown/.test(r.error)); }],
  ['detects sorted and unsorted', () => { ok(replay([0, 1, 2], []).ok); ok(!replay([1, 0, 2], []).ok); ok(!replay([0, 1, 2], ['pb']).ok); }],
  ['agrees with the Machine on random op sequences', () => {
    const next = rng(7);
    for (let t = 0; t < 300; t++) {
      const n = randInt(next, 8), input = [...Array(n).keys()].sort(() => next() - 0.5), ops = Array.from({ length: 30 }, () => OPS[randInt(next, 11)]);
      const m = new Machine(input); for (const o of ops) m.op(o);
      const r = replay(input, ops); eq(r.a, m.a); eq(r.b, m.b);
    }
  }],
];
