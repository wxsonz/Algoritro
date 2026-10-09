// The Codex (spec/08 §8.2): every card, filters, card pages, the Grasp × Craft grid, Cursed cards.
import { ALGOS, TECHS, CURSED, META as METACARDS, byId, techById, cursedById, FAMILIES, ROLES, label } from '../cards/index.js';
import { fits } from '../core/hand.js';
import { Machine } from '../core/machine.js';
import { replay } from '../core/replay.js';
import { generate, ranks } from '../core/input.js';
import { runHand } from '../core/hand.js';
import { $, el, topBar, cardsData, metaData, f0, pct, signed, cls, proofMark, dots, RARITY, badge } from './common.js';
import { markdown } from './markdown.js';
import { sparkline } from './card.js';
import { algoFace, techFace, bindCardFx } from './tcg.js';
import { PATHS } from './paths.js';
import { deckString } from '../core/hand.js';

topBar('Codex');
const [DOC, META] = await Promise.all([cardsData(), metaData()]);
const F = { type: 'all', family: 'all', role: 'all', rarity: 'all', q: '' };

const sel = (key, opts) => el('label', {}, key + ' ', el('select', { onchange: e => { F[key] = e.target.value; grid(); } }, opts.map(([v, t]) => el('option', { value: v }, t))));
$('filters').append(
  sel('type', [['all', 'all'], ['algorithm', 'Algorithm'], ['technique', 'Technique'], ['leaf', 'Finisher'], ['meta', 'Meta'], ['cursed', 'Cursed']]),
  sel('family', [['all', 'all'], ...Object.entries(FAMILIES).map(([k, f]) => [k, `${f.icon} ${f.name}`])]),
  sel('role', [['all', 'all'], ...[...ROLES, 'prep', 'post', 'leaf'].map(r => [r, r])]),
  sel('rarity', [['all', 'all'], ...Object.entries(RARITY).map(([k, v]) => [k, v])]),
  el('label', {}, 'search ', el('input', { type: 'search', placeholder: 'name or idea', oninput: e => { F.q = e.target.value.toLowerCase(); grid(); } })));

function matches(c, kind) {
  if (F.type !== 'all' && F.type !== kind && !(F.type === 'technique' && kind === 'leaf')) return false;
  if (F.family !== 'all' && c.family !== F.family) return false;
  if (F.role !== 'all' && c.role !== F.role) return false;
  if (F.rarity !== 'all' && c.rarity !== F.rarity) return false;
  if (F.q) { const d = (kind === 'algorithm' ? DOC?.algorithms : kind === 'cursed' ? DOC?.cursed : DOC?.techniques)?.[c.id]; if (!`${c.name} ${c.tagline || ''} ${c.effect || ''} ${d?.doc || c.why || ''}`.toLowerCase().includes(F.q)) return false; }
  return true;
}
function grid() {
  const g = $('grid'); g.innerHTML = '';
  const add = (title, items, faces = true) => { if (items.length) g.append(el('h2.full', {}, title), el(faces ? 'div.facegrid' : 'div.grid', {}, items)); };
  add('Algorithm cards', ALGOS.filter(a => matches(a, 'algorithm')).map(a => link(a.id, algoFace(a, { stats: META?.cards?.[a.id] }))));
  add('Technique cards', TECHS.filter(t => t.role !== 'leaf' && matches(t, 'technique')).map(t => link(t.id, techFace(t, { state: { ok: !t.unbuildable, reason: t.unbuildable || '', always: t.always }, doc: DOC?.techniques?.[t.id] }))));
  add('Finishers', TECHS.filter(t => t.role === 'leaf' && matches(t, 'leaf')).map(t => link(t.id, techFace(t, { state: { ok: !t.unbuildable, reason: t.unbuildable || '' }, doc: DOC?.techniques?.[t.id] }))));
  add('Meta cards', METACARDS.filter(m => matches(m, 'meta')).map(m => link(m.id, el('div.card.tech.meta', {}, el('div.head', {}, el('b.name', {}, m.name), el('span.rarity.' + m.rarity, {}, RARITY[m.rarity])), el('div.tagline', {}, `“${m.tagline}”`), el('div.meta', {}, `cost: ${m.cost} · Grasp ${m.grasp} · Craft ${m.craft}`)))), false);
  add('Cursed cards', CURSED.filter(c => matches(c, 'cursed')).map(c => link(c.id, el('div.card.tech.cursed', {}, el('div.head', {}, el('b.name', {}, c.name), el('span.rarity', {}, c.playable ? 'playable' : 'lesson')), el('div.effect', {}, c.why)))), false);
}
// A card opens its page: by a click (not on a link), or by Enter on the focused card.
const link = (id, node) => {
  node.style.cursor = 'pointer';
  node.onclick = e => { if (e.target.closest('a')) return; location.hash = id; };
  node.onkeydown = e => { if (e.key === 'Enter') location.hash = id; };
  return node;
};

// ---- Grasp × Craft grid --------------------------------------------------------------------
function quad() {
  const box = $('quad'); box.innerHTML = '';
  // Grasp is high from 6 (two heavy ideas), Craft from 10 functions (two files under the Norm).
  const loG = v => v < 6, loC = v => v < 10;
  const Q = [['Starter', 'Grasp low · Craft low', a => loG(a.grasp) && loC(a.craft)], ['Grinder', 'Grasp low · Craft high', a => loG(a.grasp) && !loC(a.craft)], ['Elegant', 'Grasp high · Craft low', a => !loG(a.grasp) && loC(a.craft)], ['Boss', 'Grasp high · Craft high', a => !loG(a.grasp) && !loC(a.craft)]];
  const pills = f => ALGOS.filter(f).map(a => el('a.pill', { href: '#' + a.id, title: `Grasp ${a.grasp} · Craft ${a.craft}` }, a.name));
  box.append(el('div.quad', {}, Q.map(([name, sub, f]) => { const p = pills(f); return el('div', {}, el('h4', {}, name, el('span.muted', {}, ' · ' + sub)), p.length ? p : el('p.muted', {}, 'No bare card here yet: an open space.')); })));
  // The same as a table in bands: Grasp rows (high at the top) by Craft columns.
  const GB = [[0, 2], [3, 5], [6, 8], [9, 11], [12, 99]], CB = [[0, 4], [5, 9], [10, 14], [15, 19], [20, 999]];
  const inB = (v, [a, b]) => v >= a && v <= b, hiG = ([a]) => a >= 6, hiC = ([a]) => a >= 10, name = ([a, b]) => b > 90 ? `${a}+` : `${a}–${b}`;
  const cell = (g, c) => el('td', { className: hiG(g) === hiC(c) ? (hiG(g) ? 'q-boss' : 'q-starter') : hiG(g) ? 'q-elegant' : 'q-grinder' }, ALGOS.filter(a => inB(a.grasp, g) && inB(a.craft, c)).map(a => el('a.pill', { href: '#' + a.id, style: { borderLeft: `3px solid var(--f-${a.family})` } }, a.name)));
  box.append(el('div.tablewrap', {}, el('table.data.gc', {}, el('tr', {}, el('th', {}, 'Grasp ↓ · Craft →'), CB.map(c => el('th', {}, name(c)))), [...GB].reverse().map(g => el('tr', {}, el('th', {}, name(g)), CB.map(c => cell(g, c)))))));
}

// ---- card pages ------------------------------------------------------------------------------
function page() {
  const id = decodeURIComponent(location.hash.slice(1)), box = $('page');
  if (!id) { box.hidden = true; $('index').hidden = false; return; }
  box.hidden = false; $('index').hidden = true; box.innerHTML = ''; scrollTo(0, 0);
  const back = el('p', {}, el('a', { href: '#' }, '← all cards'));
  if (byId[id]) return algoPage(byId[id], box, back);
  if (techById[id]) return techPage(techById[id], box, back);
  if (cursedById[id]) return cursedPage(cursedById[id], box, back);
  const m = METACARDS.find(x => x.id === id); if (m) return metaPage(m, box, back);
  box.append(back, el('p', {}, `No card “${id}”.`));
}
function statsTable(stats) {
  if (!stats) return el('p.muted', {}, 'No measurements yet: run node tools/meta.mjs.');
  const rows = Object.values(stats.at).map(s => el('tr', {}, el('td', {}, `n = ${s.n}`), el('td.num', {}, f0(s.mean)), el('td', {}, badge(s.n, s.grade)), el('td.num', {}, s.min), el('td.num', {}, s.max), el('td.num', {}, s.spread), el('td.num', {}, s.n >= 100 ? pct(s.pass.EXCELLENT) : '—'), el('td.num', {}, s.n >= 100 ? pct(s.pass.GOOD) : '—'), el('td.num', {}, s.runs)));
  return el('div.tablewrap', {}, el('table.data', {}, el('tr', {}, ['', 'mean', 'grade', 'min', 'max', 'spread', 'runs < EXC', 'runs < GOOD', 'runs'].map(h => el('th', { className: h && h !== 'grade' ? 'num' : '' }, h))), rows));
}
function pathsOf(match) { const out = []; for (const p of PATHS) p.steps.forEach((s, i) => { if (match(s.deck)) out.push(el('a', { href: `index.html#deck=${s.deck}&n=${s.n ?? 100}&gen=uniform&seed=42&path=${p.id}&step=${i}` }, `${p.name}, step ${i + 1}`)); }); return out; }
function algoPage(a, box, back) {
  const d = DOC?.algorithms?.[a.id], st = META?.cards?.[a.id];
  const side = el('div.cardface', {}, algoFace(a, { stats: st, cls: 'focus' }), el('p', {}, el('a', { href: `index.html#deck=${a.id}&n=${a.maxN ? Math.min(a.maxN, 7) : 100}&gen=uniform&seed=42` }, 'Play on the Table →')));
  const main = el('div', {}, el('h1', {}, `${FAMILIES[a.family].icon} ${a.name}`), el('p.lede', {}, `“${a.tagline}” · ${cls(a.claimedClass)} ${proofMark(a.proof)} · Grasp ${a.grasp} · Craft ${a.craft} functions · ${RARITY[a.rarity]}`));
  main.append(el('div.doc', { html: markdown(d?.doc || '', d?.source) }));
  main.append(el('h3', {}, 'Measured (explorer)'), statsTable(st));
  if (st?.growth) {
    main.append(el('h3', {}, 'Growth'), el('div.tablewrap', {}, el('table.data', {}, el('tr', {}, el('th', {}, 'n'), ...st.growth.map(([n]) => el('th.num', {}, n))), el('tr', {}, el('td', {}, 'mean ops'), ...st.growth.map(([, y]) => el('td.num', {}, f0(y)))))));
    if (st.classCheck) main.append(el('p', { className: st.classCheck.flagged ? 'bad' : 'good' }, st.classCheck.flagged ? `⚑ Class check: the ${cls(a.claimedClass)} fit on n ≤ 1000 underestimates ${st.classCheck.checks.map(c => `n=${c.n} by ${(100 * c.excess).toFixed(1)} %`).join(', ')}.` : `✓ Class check: n = ${st.classCheck.checks.map(c => `${c.n} within ${(100 * c.excess).toFixed(1)} %`).join(', ')} of the ${cls(a.claimedClass)} fit.`));
    for (const p of st.paramFlags || []) main.append(el('p.bad', {}, '⚑ ' + p));
  }
  if (st?.disorder) main.append(el('h3', {}, 'Disorder curve, n=100'), sparkline(st.disorder, { w: 320, h: 60 }));
  const roles = [...Object.keys(a.natives), ...a.open];
  main.append(el('h3', {}, 'Roles'), el('div.tablewrap', {}, el('table.data', {}, el('tr', {}, el('th', {}, 'role'), el('th', {}, 'in the card'), el('th', {}, 'cards that fit')),
    roles.map(r => el('tr', {}, el('td', {}, r), el('td', {}, a.natives[r] ? `${label(a.natives[r])} (native)` : a.defaults[r] ? `${label(a.defaults[r])} (default)` : '—'), el('td', {}, TECHS.filter(t => t.role === r && fits(a, t).ok).map(t => el('a', { href: '#' + t.id }, label(t.id))).flatMap((x, i) => i ? [', ', x] : [x])))),
    a.finishers ? el('tr', {}, el('td', {}, 'Finisher'), el('td', {}, a.finisher ? label(a.finisher) : a.finisherNote || '—'), el('td', {}, a.finishers.map(f => el('a', { href: '#' + f }, label(f))).flatMap((x, i) => i ? [', ', x] : [x]))) : '')));
  const ps = pathsOf(deck => deck.split('+')[0] === a.id);
  if (ps.length) main.append(el('h3', {}, 'On the Paths'), el('p', {}, ps.flatMap((x, i) => i ? [' · ', x] : [x])));
  box.append(back, el('div.cardpage', {}, side, main));
}
function techPage(t, box, back) {
  const d = DOC?.techniques?.[t.id], effects = META?.techniques?.[t.id]?.effects || [];
  const main = el('div', {}, el('h1', {}, t.name), el('p.lede', {}, `${t.role} · +${t.grasp} Grasp · +${t.craft} Craft · ${RARITY[t.rarity] || ''}${t.always ? ' · always on' : ''}`));
  if (t.unbuildable) main.append(el('p.caveat', {}, t.unbuildable));
  main.append(el('div.doc', { html: markdown(d?.doc || '', d?.source) }));
  if (effects.length) {
    main.append(el('h3', {}, 'Measured effect (paired, explorer)'), el('div.tablewrap', {}, el('table.data', {}, el('tr', {}, ['host', 'Δ @100', '± SE', 'Δ @500', '± SE', 'Value'].map(h => el('th', { className: h === 'host' ? '' : 'num' }, h))),
      effects.map(e => el('tr', {}, el('td', {}, el('a', { href: '#' + e.host }, byId[e.host].name), e.base && e.base !== e.host ? el('span.muted', {}, ` (base ${e.base})`) : '', e.input ? el('span.muted', {}, ` on ${e.input}`) : ''),
        el('td.num', {}, signed(e.at[100]?.delta)), el('td.num', {}, e.at[100]?.se ?? ''), el('td.num', {}, e.at[500] ? signed(e.at[500].delta) : '—'), el('td.num', {}, e.at[500]?.se ?? ''), el('td.num', {}, e.at[100] ? (e.at[100].delta / Math.max(1, t.craft)).toFixed(1) : ''))))));
  } else if (!t.unbuildable) main.append(el('p.muted', {}, t.always ? 'Always on in the explorer.' : 'No paired measurement on uniform input.'));
  const hosts = ALGOS.filter(a => fits(a, t).ok);
  main.append(el('h3', {}, 'Fits'), el('p', {}, hosts.length ? hosts.map(a => el('a', { href: '#' + a.id }, a.name)).flatMap((x, i) => i ? [', ', x] : [x]) : el('span.muted', {}, t.role === 'prep' || t.role === 'post' ? 'every card' : 'no card yet')));
  const ps = pathsOf(deck => deck.split('+').includes(t.id)); if (ps.length) main.append(el('h3', {}, 'On the Paths'), el('p', {}, ps.flatMap((x, i) => i ? [' · ', x] : [x])));
  box.append(back, el('div.cardpage', {}, el('div.cardface', {}, techFace(t, { state: { ok: !t.unbuildable, always: t.always }, doc: d })), main));
}
function metaPage(m, box, back) {
  const d = DOC?.meta?.[m.id];
  box.append(back, el('h1', {}, m.name), el('p.lede', {}, `“${m.tagline}” · cost: ${m.cost} · Grasp ${m.grasp} · Craft ${m.craft}`), el('div.doc', { html: markdown(d?.doc || '', d?.source) }),
    el('p', {}, el('a', { href: 'index.html' }, 'The Table plays it: one hand per flag →'), ' · ', el('a', { href: 'meta.html#builds' }, 'Builds on the Meta page →')));
}
function cursedPage(c, box, back) {
  const out = el('div');
  box.append(back, el('h1', {}, c.name), el('p.lede', {}, `Cursed · ${c.playable ? `playable naive port (n ≤ ${c.maxN})` : 'a lesson, not playable'}`), el('p', {}, c.why), c.lesson ? el('p', {}, el('b', {}, c.lesson)) : '', out);
  if (c.playable) {
    const rowsFor = ns => ns.filter(n => n <= c.maxN).map(n => {
      const r = ranks(generate('uniform', n, 1)), m = new Machine(r, { lean: true }); c.run(m); const ok = replay(r, m.ops).ok;
      const fix = c.fixedBy ? runHand({ algo: c.fixedBy, techs: [], sandbox: true }, r, { keepSteps: false }).ops.length : null;
      return el('tr', {}, el('td.num', {}, n), el('td.num', {}, f0(m.ops.length)), el('td', {}, ok ? '✓' : '✗'), el('td.num', {}, fix == null ? '—' : f0(fix)));
    });
    out.append(el('h3', {}, 'The naive port, measured here'), el('div.tablewrap', {}, el('table.data', {}, el('tr', {}, el('th.num', {}, 'n'), el('th.num', {}, 'ops'), el('th', {}, 'valid'), el('th.num', {}, c.fixedBy ? `${byId[c.fixedBy].name}` : '')), rowsFor([5, 6, 10, 20, 30, 50, 100, 200]))),
      el('p.muted', {}, `Claimed elsewhere: ${c.claimed}. Here: ${c.real}. The ops grow much faster than the card that fixes the weakness.`));
  }
  if (c.fixedBy) out.append(el('p', {}, 'Fixed by: ', el('a', { href: '#' + c.fixedBy }, byId[c.fixedBy].name)));
  if (DOC?.cursedLore) out.append(el('div.doc', { html: markdown(DOC.cursedLore, 'spec/cards/cursed.md') }));
}

addEventListener('hashchange', page);
grid(); quad(); page();
bindCardFx(document);
