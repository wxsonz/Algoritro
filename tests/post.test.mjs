import { ALGOS } from '../js/cards/index.js';
import { ranks, generate } from '../js/core/input.js';
import { replay } from '../js/core/replay.js';
import { ok, eq, play, uniform } from './assert.mjs';
const POSTS = ['noop-suppression', 'peephole-cancel', 'peephole-fuse', 'commutation-peephole'];
export const tests = [
  ['post cards keep the final state and are never longer, alone and stacked', () => {
    for (const a of ALGOS) for (const n of [5, 7, 50]) { if (a.maxN && n > a.maxN) continue; for (let s = 1; s <= 6; s++) {
      const r = uniform(n, s), base = play(a.id, r);
      for (const post of [...POSTS.map(p => [p]), POSTS]) { const x = play(a.id, r, post); ok(x.valid, `${a.id} ${post} n=${n}`); ok(x.ops.length <= base.ops.length, `${a.id} ${post} longer`); }
    } }
  }],
  ['Peephole Cancel trims the radix pass ends (spec: −78 at n=100)', () => {
    let saved = 0; for (let s = 1; s <= 50; s++) { const r = uniform(100, s); saved += play('lsd-radix', r).ops.length - play('lsd-radix', r, ['peephole-cancel']).ops.length; }
    ok(Math.abs(saved / 50 - 78) < 6, `mean saved ${saved / 50}`);
  }],
  ['Presorted Shortcut: sorted costs 0, a rotation costs min(k, n−k)', () => {
    eq(play('lsd-radix', [...Array(100).keys()], ['presorted-shortcut']).ops.length, 0);
    eq(play('lsd-radix', ranks(generate('rotated', 100, 1, 30)), ['presorted-shortcut']).ops.length, 30);
    eq(play('lsd-radix', ranks(generate('rotated', 100, 1, 80)), ['presorted-shortcut']).ops.length, 20);
  }],
  ['Double-Op Sharing off costs Turk ops (spec: +98 at n=100)', () => {
    let d = 0; for (let s = 1; s <= 30; s++) { const r = uniform(100, s); d += play('turk', r, [], { sharing: false }).ops.length - play('turk', r).ops.length; }
    ok(d / 30 > 70 && d / 30 < 130, `mean +${d / 30}`);
  }],
  ['No-op Suppression replays to the same state as the original stream', () => {
    for (let s = 1; s <= 20; s++) { const r = uniform(30, s), a = play('four-end-quicksort', r, ['noop-suppression']); ok(replay(r, a.ops).ok); }
  }],
];
