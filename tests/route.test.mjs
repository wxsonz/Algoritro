// Routes: where each input goes, by size (the tiny seat) and by the subject's disorder thresholds.
import { routeOf, TINY_MAX, tinyCard } from '../js/core/meta-run.js';
import { generate } from '../js/core/input.js';
import { STACKS, stackRoute } from '../js/ui/stacks.js';
import { eq, ok } from './assert.mjs';
const at = d => routeOf(generate('disorder', 100, 1, d)).route;   // exact disorder at n=100
export const tests = [
  ['the subject\'s thresholds: below 0.2 simple, 0.2 to 0.5 medium, 0.5 and above complex', () => {
    eq([at(0), at(0.199), at(0.2), at(0.499), at(0.5), at(1)], ['simple', 'simple', 'medium', 'medium', 'complex', 'complex']);
  }],
  ['the tiny seat takes 7 numbers or fewer, whatever their disorder', () => {
    eq(TINY_MAX, 7);
    for (const n of [0, 1, 2, 3, 4, 5, 6, 7]) eq(routeOf(generate('reversed', n, 1)).route, 'tiny');
    eq(routeOf(generate('reversed', 8, 1)).route, 'complex');
    eq([tinyCard(3), tinyCard(4), tinyCard(7)], ['hardcoded-three', 'oracle', 'oracle']);
  }],
  ['the 29 stacks route as objective.md lists them, at the default seed 1000', () => {
    const by = {}; for (const b of STACKS) (by[stackRoute(b, 1000).route] ||= []).push(b.id);
    eq([by.tiny.length, by.simple.length, by.medium.length, by.complex.length], [7, 5, 10, 7]);
    ok(by.tiny.includes('four') && by.tiny.includes('six') && by.medium.includes('local25-100'), 'the tiny seat\'s new stacks, and the local quarter in --medium');
    ok(by.medium.includes('peak-100') && by.complex.includes('valley-100'), 'mirror shapes split across 0.5');
    ok(by.complex.includes('random-100') && by.medium.includes('random-500'), 'random stacks straddle 0.5: at seed 1000, Random 100 goes to complex and Random 500 to medium');
    ok(by.complex.includes('messy50-100') && by.simple.includes('sorted') && by.simple.includes('nearly-500'), 'exactly half messy goes to complex; nearly sorted to simple');
  }],
];
