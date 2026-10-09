// The Meta page (spec/05): what is actually good, computed from runs (data/meta.json).
import { ALGOS, TECHS, byId, techById, label } from '../cards/index.js';
import { DECKS } from '../cards/decks.js';
import { fits, resolve, parseDeck, deckString } from '../core/hand.js';
import { $, el, topBar, metaData, f0, f1, pct, signed, cls, proofMark, badge, tier, gradeName } from './common.js';

topBar('Meta');
const M = await metaData();
if (!M) { $('content').append(el('p.error', {}, 'data/meta.json is missing: run node tools/meta.mjs.')); throw new Error('no meta'); }
$('generated').textContent = `Generated ${M.generated} with ${M.seeds[100]} seeds at n=100 and ${M.seeds[500]} at n=500${M.quick ? ' (quick mode)' : ''}. Seeds 1000 onwards, the same for every hand; technique effects are paired.`;

const SECTIONS = [['tiers', 'Tier list'], ['builds', 'Builds'], ['pareto', 'Pareto front'], ['value', 'Technique value'], ['matrix', 'Interactions'], ['class', 'Class check'], ['disorder', 'Disorder winners'], ['decks', 'Named decks'], ['open', 'Open spaces']];
const tabs = $('tabs'), content = $('content');
tabs.append(...SECTIONS.map(([id, t]) => el('button', { dataset: { id }, onclick: () => { location.hash = id; } }, t)));
const play = (deck, presets, n = 100) => `index.html#deck=${deck}&n=${n}&gen=uniform&seed=42${Object.entries(presets || {}).map(([k, v]) => `&preset.${k}=${encodeURIComponent(v)}`).join('')}`;
const th = (h, num) => el('th', { className: num ? 'num' : '' }, h);
const table = (head, rows) => el('div.tablewrap', {}, el('table.data', {}, el('tr', {}, head.map(([h, num]) => th(h, num))), rows));

// Every measured hand: bare cards, decks, and one-technique variants.
function hands() {
  const out = [];
  for (const a of ALGOS) { const c = M.cards[a.id]; if (!c?.at[100]) continue; const R = resolve({ algo: a.id, techs: [] }); out.push({ name: a.name, deck: a.id, at: c.at, grasp: R.grasp, craft: R.craft, cls: a.claimedClass, kind: 'card' }); }
  for (const [id, d] of Object.entries(M.decks)) out.push({ name: d.name, deck: d.deck, presets: d.presets, at: d.at, grasp: d.grasp, craft: d.craft, cls: byId[parseDeck(d.deck).algo].claimedClass, kind: 'deck' });
  for (const [tid, t] of Object.entries(M.techniques)) for (const e of t.effects) {
    if (!e.at?.[100]?.variant || e.input) continue;
    const base = parseDeck(e.base || e.host), hand = tid === 'double-op-sharing' ? { ...base, sharing: false } : { ...base, techs: [...base.techs, tid] };
    const R = resolve(hand); if (!R.ok) continue;
    const v = n => e.at[n] ? { mean: e.at[n].variant.mean, pass: e.at[n].variant.pass, grade: e.at[n].variant.grade, max: e.at[n].variant.max } : null;
    out.push({ name: `${byId[e.host].name} ${tid === 'double-op-sharing' ? '− Double-Op Sharing' : '+ ' + label(tid)}${base.techs.length ? ` (on ${base.techs.map(label).join(' + ')})` : ''}`, deck: deckString(hand), at: { 100: v(100), 500: v(500) }, grasp: R.grasp, craft: R.craft, cls: byId[e.host].claimedClass, kind: 'variant' });
  }
  return out;
}
const HANDS = hands();
const capped = x => x;   // Grasp and Craft run 0–10; a hand past 10 shows its real total

const render = {
  tiers() {
    const box = el('div');
    box.append(el('p.lede', {}, 'Complete hands ranked by mean ops. The evaluation grades every run, so each row also shows the share of runs under its bar. Hand Grasp and Craft are the card plus the costs of what was added, on a 0–10 scale (a big hand can go past 10).'));
    for (const n of [100, 500]) {
      const rows = HANDS.filter(h => h.at[n]).sort((a, b) => a.at[n].mean - b.at[n].mean);
      box.append(el('h3', {}, `n = ${n}`), table([['tier'], ['hand'], ['mean', 1], ['grade'], ['runs < EXC', 1], ['worst', 1], ['Grasp', 1], ['Craft', 1], ['class']],
        rows.map(h => { const s = h.at[n], t = tier(n, s.mean); return el('tr', { className: h.kind === 'deck' ? 'hl' : '' }, el('td', {}, el('span.tier.tier-' + t, {}, t)), el('td', {}, el('a', { href: play(h.deck, h.presets, n) }, h.name), h.kind === 'deck' ? el('span.muted', {}, ' · deck') : ''), el('td.num', {}, f0(s.mean)), el('td', {}, badge(n, s.grade)), el('td.num', {}, pct(s.pass?.EXCELLENT)), el('td.num', {}, s.max ?? '—'), el('td.num', {}, capped(h.grasp)), el('td.num', {}, capped(h.craft)), el('td', {}, cls(h.cls))); })));
    }
    return box;
  },
  builds() {
    const box = el('div', {}, el('p.lede', {}, 'A build is an Adaptive Selector around a simple, a medium and a complex hand: what the evaluation runs. Uniform input sits at disorder 0.50 ± 0.03, so about half the runs go to the medium hand and half to the complex one, and a build\'s worst runs come from the weaker one.'));
    box.append(table([['build'], ['simple / medium / complex'], ['classes hold'], ['@100 mean', 1], ['runs < 700', 1], ['@500 mean', 1], ['runs < 5500', 1], ['regimes @100']],
      M.builds.map(b => el('tr', {}, el('td', {}, el('b', {}, b.name)), el('td.small', {}, `${b.decks.simple} / ${b.decks.medium} / ${b.decks.complex}`),
        el('td', { className: b.compliance.ok ? 'good' : 'bad', title: b.compliance.problems.join('\n') }, b.compliance.ok ? '✓ yes' : '✕ ' + b.compliance.problems.length + ' issue' + (b.compliance.problems.length > 1 ? 's' : '')),
        el('td.num', {}, f0(b.at[100].mean)), el('td.num', {}, pct(b.at[100].pass.EXCELLENT)), el('td.num', {}, f0(b.at[500].mean)), el('td.num', {}, pct(b.at[500].pass.EXCELLENT)),
        el('td.small', {}, Object.entries(b.at[100].regimes).map(([k, v]) => `${k} ${pct(v)}`).join(', '))))));
    for (const b of M.builds.filter(b => !b.compliance.ok)) box.append(el('p.small', {}, el('b', {}, b.name + ': '), b.compliance.problems.join('; ')));
    return box;
  },
  pareto() {
    const box = el('div', {}, el('p.lede', {}, 'Mean ops against Hand Craft. The front is the best result at each level of effort: the chart for deciding what to build next.'));
    for (const n of [100, 500]) {
      const pts = HANDS.filter(h => h.at[n]).map(h => ({ x: Math.min(h.craft, 14), y: h.at[n].mean, h }));
      const lim = n === 100 ? 2000 : 12000, shown = pts.filter(p => p.y < lim);
      const front = []; for (let c = 0; c <= 14; c++) { const best = shown.filter(p => p.x <= c).sort((a, b) => a.y - b.y)[0]; if (best && (!front.length || best.y < front[front.length - 1].y)) front.push(best); }
      const W = 640, H = 300, y0 = Math.min(...shown.map(p => p.y)) * 0.95, y1 = lim, X = x => 50 + (x - 1) * (W - 70) / 14, Y = y => 10 + (H - 40) * (Math.log(y) - Math.log(y1)) / (Math.log(y0) - Math.log(y1));
      let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pareto front at n=${n}">`;
      for (let c = 2; c <= 14; c += 2) svg += `<text x="${X(c) - 4}" y="${H - 14}">${c === 14 ? '14+' : c}</text>`;
      svg += `<text x="${W / 2 - 30}" y="${H - 1}">Hand Craft →</text>`;
      for (const v of n === 100 ? [500, 700, 1000, 1500] : [4000, 5500, 8000]) svg += `<line class="axis" x1="45" x2="${W - 10}" y1="${Y(v)}" y2="${Y(v)}" stroke-dasharray="3 3"/><text x="2" y="${Y(v) + 4}">${v}</text>`;
      svg += `<path d="${front.map((p, i) => `${i ? 'L' : 'M'}${X(p.x)},${Y(p.y)}`).join('')}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
      for (const p of shown) svg += `<circle cx="${X(p.x) + (Math.random() - 0.5) * 18}" cy="${Y(p.y)}" r="${p.h.kind === 'deck' ? 4 : 2.5}" fill="${front.includes(p) ? 'var(--accent)' : 'var(--muted)'}" opacity="${front.includes(p) ? 1 : 0.6}"><title>${p.h.name}: ${f0(p.y)} ops, Craft ${p.h.craft}</title></circle>`;
      box.append(el('h3', {}, `n = ${n}`), el('div', { html: svg + '</svg>' }), el('p.small', {}, 'Front: ', front.map(p => el('a', { href: play(p.h.deck, p.h.presets, n) }, `${p.h.name} (${f0(p.y)}, Craft ${p.h.craft})`)).flatMap((x, i) => i ? [' → ', x] : [x])));
    }
    return box;
  },
  value() {
    const rows = [];
    for (const t of TECHS) {
      const effs = M.techniques[t.id]?.effects?.filter(e => e.at?.[100] && !e.input) || [];
      if (!effs.length) continue;
      const best = effs.reduce((a, b) => (b.at[500]?.delta ?? b.at[100].delta) < (a.at[500]?.delta ?? a.at[100].delta) ? b : a);
      const v100 = -best.at[100].delta / Math.max(1, t.craft), v500 = best.at[500] ? -best.at[500].delta / Math.max(1, t.craft) : null;
      rows.push({ t, best, effs, v100, v500 });
    }
    rows.sort((a, b) => (b.v500 ?? b.v100) - (a.v500 ?? a.v100));
    return el('div', {}, el('p.lede', {}, 'For every technique, its measured Δops on each host it fits, and Value = ops saved ÷ max(1, added Craft): ops saved per unit of pain. "What should I add next?"'),
      table([['technique'], ['role'], ['+Craft', 1], ['best host'], ['Δ @100', 1], ['Δ @500', 1], ['Value @500', 1], ['all hosts']], rows.map(({ t, best, effs, v100, v500 }) =>
        el('tr', {}, el('td', {}, el('a', { href: `codex.html#${t.id}` }, label(t.id))), el('td', {}, t.role), el('td.num', {}, t.craft), el('td', {}, byId[best.host].name),
          el('td.num', { className: 'num ' + (best.at[100].delta < 0 ? 'good' : best.at[100].delta > 0 ? 'bad' : '') }, `${signed(best.at[100].delta)} ± ${best.at[100].se}`),
          el('td.num', { className: 'num ' + ((best.at[500]?.delta ?? 0) < 0 ? 'good' : (best.at[500]?.delta ?? 0) > 0 ? 'bad' : '') }, best.at[500] ? `${signed(best.at[500].delta)} ± ${best.at[500].se}` : '—'),
          el('td.num', {}, v500 != null ? f1(v500) : f1(v100)),
          el('td.small', {}, effs.map(e => `${byId[e.host].name} ${signed(e.at[100].delta)}${e.at[500] ? ' / ' + signed(e.at[500].delta) : ''}`).join(' · '))))));
  },
  matrix() {
    const box = el('div', {}, el('p.lede', {}, 'Technique × technique on one host: I = Δ(both) − Δ(first) − Δ(second), paired on the same seeds. ✦ synergy: the pair saves more than the sum (by more than 2 SE). ✕ overlap: it saves less. ⚔ clash: worse than the better card alone. A blank cell is additive.'));
    const host = el('select', { onchange: () => draw() }, Object.keys(M.interactions).map(h => el('option', { value: h, selected: h === 'four-end-quicksort' }, byId[h].name)));
    const nSel = el('select', { onchange: () => draw() }, [100, 500].map(n => el('option', { value: n }, `n = ${n}`)));
    const out = el('div'); box.append(el('div.row', {}, el('label', {}, 'host ', host), el('label', {}, nSel)), out);
    const draw = () => {
      out.innerHTML = '';
      const rows = M.interactions[host.value], n = nSel.value, cards = [...new Set(rows.flatMap(r => [r.a, r.b]))];
      const cell = (a, b) => { const r = rows.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a)); const s = r?.at?.[n]; if (!s) return el('td.muted', {}, a === b ? '·' : ''); const mark = { synergy: ['✦', 'cell-syn'], overlap: ['✕', 'cell-ovl'], clash: ['⚔', 'cell-clash'], additive: ['', ''] }[s.badge]; return el('td', { className: mark[1], title: `${label(a)} + ${label(b)}: I = ${s.I} ± ${s.se}, both = ${s.both} ops (${s.badge})` }, `${mark[0]}${mark[0] ? ' ' : ''}${signed(s.I)}`); };
      out.append(el('div.tablewrap', {}, el('table.data.matrix', {}, el('tr', {}, el('th', {}, ''), cards.map(c => el('th', {}, label(c)))), cards.map(a => el('tr', {}, el('th', {}, label(a)), cards.map(b => cell(a, b)))))));
      const notable = rows.filter(r => r.at[n] && r.at[n].badge !== 'additive').sort((x, y) => x.at[n].I - y.at[n].I);
      out.append(el('h3', {}, 'Badges'), notable.length ? el('ul', {}, notable.map(r => el('li', {}, `${{ synergy: '✦', overlap: '✕', clash: '⚔' }[r.at[n].badge]} ${label(r.a)} + ${label(r.b)}: I = ${signed(r.at[n].I)} ± ${r.at[n].se}, both ${f0(r.at[n].both)} ops`))) : el('p.muted', {}, 'Every pair is additive here.'));
    };
    draw(); return box;
  },
  class() {
    return el('div', {}, el('p.lede', {}, 'For each card: the claimed class, the proof mark, and the growth check (fit a·f(n) + b·n on n ≤ 1000, then compare 2048 and 4096; flagged when a size is more than 5 % above the fit). Constant params on an O(n√n) claim are flagged without measuring.'),
      table([['card'], ['claimed'], ['proof'], ['n = 2048', 1], ['n = 4096', 1], ['check'], ['params']], ALGOS.map(a => {
        const c = M.cards[a.id], ck = c?.classCheck, x = n => { const k = ck?.checks.find(z => z.n === n); return k ? `${k.excess > 0 ? '+' : ''}${(100 * k.excess).toFixed(1)} %` : '—'; };
        return el('tr', {}, el('td', {}, el('a', { href: `codex.html#${a.id}` }, a.name)), el('td', {}, cls(a.claimedClass)), el('td', {}, proofMark(a.proof)), el('td.num', {}, x(2048)), el('td.num', {}, x(4096)),
          el('td', { className: ck ? (ck.flagged ? 'bad' : 'good') : 'muted' }, ck ? (ck.flagged ? '⚑ flagged' : '✓ holds') : 'not checked'), el('td.small', { className: c?.paramFlags?.length ? 'bad' : '' }, c?.paramFlags?.join('; ') || ''));
      })));
  },
  disorder() {
    const D = M.disorder, box = el('div', {}, el('p.lede', {}, 'Mean ops at exact disorder levels (a random Lehmer code with exactly d · n(n−1)/2 inversions). Exact-disorder inputs are easier than uniform input at the same disorder, so this ranks hands; it does not predict grades. "Compliant" is the cheapest hand that meets the regime\'s class target.'));
    for (const n of [100, 500]) {
      box.append(el('h3', {}, `n = ${n}`), table([['d', 1], ['regime'], ['cheapest'], ['compliant winner'], ...D.hands.map(h => [h.name, 1])], D.at[n].map(r => el('tr', {}, el('td.num', {}, r.d), el('td', {}, r.regime),
        el('td', {}, D.hands[r.winner].name), el('td', {}, r.compliantWinner >= 0 ? D.hands[r.compliantWinner].name : '—'),
        r.means.map((m, i) => el('td.num', { className: i === r.compliantWinner ? 'num good' : i === r.winner ? 'num' : 'num muted' }, f0(m)))))));
    }
    return box;
  },
  decks() {
    return el('div', {}, el('p.lede', {}, 'Named decks give peers a shared vocabulary. Natives and defaults are part of the card and add nothing to the Hand totals. "sim" is the reference simulator\'s number, "ref" the reference C build\'s.'),
      table([['deck'], ['hand'], ['@100', 1], ['@500', 1], ['sim', 1], ['ref', 1], ['Grasp / Craft'], ['tier @500'], ['note']], DECKS.map(d => {
        const m = M.decks[d.id]; return el('tr', {}, el('td', {}, el('a', { href: play(m.deck, m.presets, 100) }, el('b', {}, d.name))), el('td.small', {}, m.deck, m.presets ? ` (${Object.values(m.presets).join(', ')})` : ''),
          el('td.num', {}, f0(m.at[100].mean)), el('td.num', {}, f0(m.at[500].mean)), el('td.num.muted', {}, `${d.sim[0]} / ${d.sim[1]}`), el('td.num.muted', {}, d.ref ? `${d.ref[0]} / ${d.ref[1]}` : ''),
          el('td', {}, `${capped(m.grasp)} / ${capped(m.craft)}`), el('td', {}, el('span.tier.tier-' + tier(500, m.at[500].mean), {}, tier(500, m.at[500].mean))), el('td.small', {}, d.note));
      })));
  },
  open() {
    const open = [];
    for (const a of ALGOS) for (const t of TECHS) { const f = fits(a, t); if (f.open) open.push([a, t, f.reason]); }
    const refs = ALGOS.filter(a => a.ref), mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
    return el('div', {}, el('p.lede', {}, 'Cells with no measured hand yet: invitations to explore. Each pair below is a role the card has open, with a technique nobody has built on it.'),
      el('h3', {}, 'Cards with a reference build of their own'), el('p.small', {}, 'C in the Norm\'s style, one card per binary, measured on the study\'s seeds 1000–1004 and checked by its independent replayer. Each gives the same count as the card here on every one of those inputs.'),
      el('ul', {}, refs.map(a => el('li', {}, el('a', { href: `codex.html#${a.id}` }, a.name), `: ${f0(mean(a.ref[100]))} @100, ${f0(mean(a.ref[500]))} @500 (ref).`))),
      el('h3', {}, 'Unbuilt technique × host pairs'), table([['host'], ['technique'], ['role'], ['note']], open.map(([a, t, r]) => el('tr', {}, el('td', {}, a.name), el('td', {}, label(t.id)), el('td', {}, t.role), el('td.small.muted', {}, r)))),
      el('h3', {}, 'From the spec'), el('ul', {}, [
        'Ternary Radix: can a gather that avoids the rrb return trip make base 3 pay?',
        'Tape Merge: does a polyphase distribution of the runs (Fibonacci counts) save a pass?',
        'LSD radix without the return trip: alternate the pass direction so the minority bucket never comes back.',
        'LIS Anchor + Four-End Quicksort: keep an increasing run in place while partitioning the rest?',
        'The full DP Splits, with rr merges and free reads.',
        'Beam Leaf: leaves of up to 32 values, the main gap between Four Corners and Oracle\'s Plan.',
        'A greedy with a proven bound: how small can a cheapest-pick window get and keep its class?',
        'The Elegant quadrant: no bare card is hard to see but short to write.',
        'The gap to optimal at n=100: the best known is 420 (ref), the information-theoretic floor about 152.',
        'A better disorder metric for Adaptive: try the alternatives in Lab › Disorder map.',
      ].map(s => el('li', {}, s))));
  },
};
function show() {
  const id = SECTIONS.some(([s]) => s === location.hash.slice(1)) ? location.hash.slice(1) : 'tiers';
  for (const b of tabs.children) b.classList.toggle('on', b.dataset.id === id);
  content.replaceChildren(render[id]());
}
addEventListener('hashchange', show); show();
