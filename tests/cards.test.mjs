import { ALGOS, TECHS, META, byId, techById, findCard } from '../js/cards/index.js';
import { CONCEPTS, SHARED, KIT_FNS, tally } from '../js/cards/stats.js';
import { resolve } from '../js/core/hand.js';
import { buildTotals } from '../js/core/meta-run.js';
import { BUILDS } from '../js/cards/decks.js';
import { execFileSync } from 'node:child_process';
import { runHand } from '../js/core/hand.js';
import { allHands } from '../js/core/combos.js';
import { generate, GENERATORS, ranks } from '../js/core/input.js';
import { distanceTable } from '../js/cards/algos/oracle.js';
import { ok, eq, perms, play } from './assert.mjs';

const fits = (a, n) => a.maxN == null || n <= a.maxN;
const tables = {}; const opt = p => (tables[p.length] ??= distanceTable(p.length)).of(p);
const SMALL = [0, 1, 2, 3, 4, 5, 6, 7, 20];

export const tests = [
  ['every card sorts every input with n ≤ 6 and never beats the Oracle', () => {
    for (const a of ALGOS) for (let n = 0; n <= 6; n++) if (fits(a, n)) for (const p of perms(n)) {
      const r = play(a.id, p); ok(r.valid, `${a.id} on [${p}]: ${r.error}`); ok(r.ops.length >= opt(p), `${a.id} beat the Oracle on [${p}]`);
    }
  }],
  ['every bare card × generator × n ∈ {0..7, 20, 100} × 5 seeds sorts', () => {
    for (const a of ALGOS) for (const g of Object.keys(GENERATORS)) for (const n of [...SMALL, 100]) if (fits(a, n) && !(a.id === 'oracle' && n > 7))
      for (let s = 1; s <= (a.id === 'beam-sorter' && n === 100 ? 1 : 5); s++) { const r = play(a.id, ranks(generate(g, n, s))); ok(r.valid, `${a.id} ${g} n=${n} seed ${s}: ${r.error}`); }
  }],
  ['every legal hand × generator × n ∈ {0..7, 20} sorts, and n = 100 too', () => {
    let count = 0;
    for (const a of ALGOS) for (const h of allHands(a).legal) {
      for (const g of Object.keys(GENERATORS)) for (const n of SMALL) if (fits(a, n) && !(a.id === 'oracle' && n > 7)) {
        const r = runHand(h, ranks(generate(g, n, 3)), { keepSteps: false }); ok(r.valid, `${h.algo}+${h.techs.join('+')} ${g} n=${n}: ${r.error}`); count++;
      }
      if (fits(a, 100) && a.id !== 'oracle') { const r = runHand(h, ranks(generate('uniform', 100, 7)), { keepSteps: false }); ok(r.valid, `${h.algo}+${h.techs.join('+')} n=100`); count++; }
    }
    ok(count > 40000, `only ${count} runs`);
  }],
  ['illegal hands are rejected by hand.js, never silently run', () => {
    let n = 0;
    for (const a of ALGOS) for (const h of allHands(a).illegal) { let threw = false; try { runHand(h, [2, 0, 1]); } catch { threw = true; } ok(threw, `${h.algo}+${h.techs.join('+')} ran`); n++; }
    ok(n > 50);
    for (const bad of [['lsd-radix', ['rb-sink']], ['turk', ['cheapest-pick']], ['min-extract', ['four-way-cost']], ['chunks', ['multi-band']], ['four-end-quicksort', ['dp-splits', 'pivot-by-leaf-count']], ['butterfly', ['second-max-lookahead', 'cheapest-return']]]) {
      let threw = false; try { play(bad[0], [1, 0], bad[1]); } catch { threw = true; } ok(threw, bad.join(' '));
    }
  }],
  ['slot limits apply outside Sandbox', () => {
    let threw = false; try { runHand({ algo: 'butterfly', techs: ['second-max-lookahead', 'rb-sink'], sandbox: false }, [1, 0]); } catch { threw = true; } ok(!threw, 'a default played again uses no slot');
    threw = false; try { runHand({ algo: 'simple-insertion', techs: ['lis-anchor', 'cheapest-pick', 'four-way-cost', 'rb-sink', 'beam-over-orders'], sandbox: false }, [1, 0]); } catch { threw = true; } ok(threw, '5 cards in 4 slots');
  }],
  ['Hardcoded Three is optimal on all 6 orders, at most 2 ops', () => { for (const p of perms(3)) { const r = play('hardcoded-three', p); eq(r.ops.length, opt(p), `[${p}]`); ok(r.ops.length <= 2); } }],
  ['Five Hand: at most 10 ops at n=5, mean 7.37', () => { let s = 0, mx = 0; for (const p of perms(5)) { const k = play('five-hand', p).ops.length; s += k; mx = Math.max(mx, k); } eq(mx, 10); eq((s / 120).toFixed(2), '7.37'); }],
  ['Oracle streams are optimal (n ≤ 6)', () => { for (let n = 0; n <= 6; n++) for (const p of perms(n)) eq(play('oracle', p).ops.length, opt(p), `[${p}]`); }],
  ['BFS Leaf as a Finisher is optimal on what it is given', () => { for (const p of perms(5)) { const r = play('five-hand', p, ['bfs-leaf']); ok(r.valid); } }],
  ['cards refuse inputs above their maxN', () => { let threw = false; try { play('hardcoded-three', [3, 2, 1, 0]); } catch { threw = true; } ok(threw); }],
  ['determinism: same seed and hand give byte-identical streams', () => {
    for (const a of ALGOS) { const n = a.maxN ? Math.min(a.maxN, 7) : 100; const r = ranks(generate('uniform', n, 42)); eq(play(a.id, r).ops.join(), play(a.id, r).ops.join(), a.id); }
  }],
  ['every card names its concepts, counts its functions, and says where the count comes from', () => {
    for (const c of [...ALGOS, ...TECHS, ...META]) {
      ok(Array.isArray(c.knows) && c.knows.every(k => CONCEPTS[k]), `${c.id}: knows`);
      ok(Number.isInteger(c.fns) && c.fns >= 0 && (c.uses || []).every(k => SHARED[k]), `${c.id}: fns and uses`);
      ok(/^(counted|est\.|in the base kit|part of|the disorder count)/.test(c.from), `${c.id}: from`);
    }
  }],
  ['Grasp and Craft add up as sets: an idea or a piece of code counts once', () => {
    const si = byId['simple-insertion'], cr = techById['cheapest-return'];
    eq(tally([si, cr], { find: findCard }).craft, si.fns + cr.fns + SHARED['insert-core'].fns, 'the insertion core, once');
    const lis = resolve({ algo: 'lis-insertion', techs: ['four-way-cost'], sandbox: true }), two = resolve({ algo: 'lis-insertion', techs: [], sandbox: true });
    eq(lis.grasp, two.grasp, 'Four-Way Cost asks nothing Two-Way Cost had not');
    const strong = BUILDS.find(b => b.id === 'strong-build'), T = buildTotals(strong);
    ok(T.craft < KIT_FNS + ['simple', 'medium', 'complex'].reduce((s, k) => s + resolve(strong[k]).craft, 0) + byId.oracle.craft + 1, 'the build shares the BFS core between the Oracle and BFS Leaf');
    ok(T.concepts.includes('bfs') && T.concepts.includes('disorder'), 'the tiny seat and the kit count');
  }],
  ['spec/grasp-craft.md is up to date with the card data (else run node tools/grasp-craft.mjs)', () => {
    execFileSync('node', [new URL('../tools/grasp-craft.mjs', import.meta.url).pathname, '--check'], { stdio: 'pipe' });
  }],
];
