// The Table (spec/08 §8.1) as a card table that plays a push_swap build: one hand per flag
// (--simple, --medium, --complex) and the built-in tiny seat. Every stack goes to the seat its
// size and disorder pick (objective.md §2–§4), and the mat shows that seat. The left panel holds
// the stack you are sorting, the score, and every stack with its route; the mat has the build,
// the slots, the played card, the board, and your hand with the two decks beside it.
// The custom input opens as an overlay.
import { ALGOS, TECHS, byId, techById, FAMILIES, ROLES, label } from '../cards/index.js';
import { DECKS, deckById, BUILDS } from '../cards/decks.js';
import { GENERATORS, generate, parseManual, describe } from '../core/input.js';
import { resolve, fits, parseDeck, deckString } from '../core/hand.js';
import { runAdaptive, routeOf, tinyCard, TARGETS, meetsTarget, classProblems } from '../core/meta-run.js';
import { grade, thresholds } from '../core/metrics.js';
import { useDpTables } from '../cards/engines/divide.js';
import { loadData } from '../core/data.js';
import { $, el, esc, topBar, cardsData, metaData, f0, signed, gradeName, store } from './common.js';
import { markdown, sections } from './markdown.js';
import { mini } from './card.js';
import { Board } from './board.js';
import { algoFace, techFace, plainFace, needsEl, deckBox, pile, bindCardFx, ROLE_NAMES, ROLE_HINT, psTier, modularity, modTier, classLabel, CLASS_TIER, PS_TIER_TEXT } from './tcg.js';
import { icon } from './pixel.js';
import { bindTips } from './tip.js';
import { runAll } from './worker-client.js';
import { STACKS, LEVELS, SEED, stamp, stampClass, goal, matchStack, stackRoute, stackById } from './stacks.js';
import { PATHS } from './paths.js';

let shown = null, countTimer = 0;   // the move counter's displayed value
const SEATS = ['simple', 'medium', 'complex'];   // one hand per flag; the tiny seat is built in
const RANGE = { simple: 'below 0.2', medium: '0.2 to 0.5', complex: '0.5 and up', tiny: '≤ 5 numbers' };
const SEAT_KEY = { simple: 's', medium: 'm', complex: 'c' };   // in share links
const S = {
  build: buildOf(BUILDS.find(b => b.id === 'strong-build')),
  seat: 'complex', lastStack: {},   // the seat on the mat (the current stack's route), and each seat's last stack
  // The hand on the mat: the seat's, or the tiny seat's fixed card, which nothing can change.
  get hand() { return this.seat === 'tiny' ? tinyHand(this.input?.n ?? 3) : this.build[this.seat]; },
  set hand(h) { if (this.seat !== 'tiny') this.build[this.seat] = h; },
  input: null, result: null, resolved: null, delta: null, stack: null, lastChange: '',
  family: 'all', techFilter: 'all',
  path: null, step: 0,
  stamps: {}, stampKey: '', stampJob: null, known: new Map(),   // stack results per hand: handKey → stack id → result
  shownAlgo: '', handEls: new Map(), handKey: '', opener: null,
  routes: Object.fromEntries(STACKS.map(b => [b.id, stackRoute(b)])),   // each stack's disorder and flag
};
// Hands are copied in, so editing a seat never touches a named deck or build.
function handOf(h) { return { ...structuredClone(h), sharing: h.sharing ?? true, sandbox: true, params: { ...(h.params || {}) }, presets: { ...(h.presets || {}) } }; }
function buildOf(b) { return Object.fromEntries(SEATS.map(k => [k, handOf(b[k])])); }
function fillAll(h) { S.build = Object.fromEntries(SEATS.map(k => [k, handOf(h)])); }   // one hand in every seat
function tinyHand(n) { return { algo: tinyCard(n), techs: [], sharing: true, sandbox: true, params: {}, presets: {} }; }
function seatHand(route, n) { return route === 'tiny' ? tinyHand(n) : S.build[route]; }
function handKey(h) { return JSON.stringify([deckString(h), h.params || {}, h.presets || {}]); }
const QUICK = [3, 5, 7, 20, 100, 500];
const ORDER = [...ROLES, 'leaf', 'prep', 'post'];
const FAMILY_HINT = {
  small: 'tiny inputs, solved outright', selection: 'take the smallest, again and again', insertion: 'place each number where it belongs',
  bucket: 'drop numbers into bands, then gather', digit: 'sort by bits or digits', divide: 'split, conquer, merge', search: 'look ahead and plan',
};
const SLOT_NAMES = { ...ROLE_NAMES, extra: 'Extras' };
const SLOT_ICON = r => r === 'extra' ? 'prep' : r;
const MARK = { EXCELLENT: '★', PERFECT: '★', GOOD: '✓', PASS: '✓', FAIL: '✕', '…': '…', '—': '—' };
let DOC = null, META = null;

topBar('Table', () => board.render());
const board = new Board($('board'), { dock: $('console'), log: $('movelog') });
bindCardFx();
bindTips();
// The played card fits the height of its row. The row is measured here, not with container units:
// a size container restyles the card inside it with every layout of the board beside it, which is
// every move during playback.
new ResizeObserver(([e]) => e.target.style.setProperty('--midH', `${Math.round(e.contentRect.height)}px`)).observe(document.querySelector('.mid'));

// ---- setup ----------------------------------------------------------------------------------
for (const q of QUICK) $('quick').append(el('button', { onclick: () => { $('n').value = q; $('manual').value = ''; draw(); } }, q));
for (const [k, g] of Object.entries(GENERATORS)) $('gen').append(new Option(g.label, k));
$('gen').onchange = () => { syncParam(); draw(); };
for (const id of ['n', 'seed', 'param', 'manual']) $(id).onchange = draw;
$('reroll').onclick = () => { $('seed').value = Math.floor(Math.random() * 2 ** 31); draw(); };
$('familyFilter').append(...[['all', 'All'], ...Object.entries(FAMILIES).map(([k, f]) => [k, f.name])].map(([k, t]) =>
  el('button.chip', { dataset: { f: k }, onclick: () => { S.family = k; markAlgoViewer(); } }, k === 'all' ? '' : el('span.pxi', { html: icon(k) }), t)));
$('techFilter').append(...[['all', 'Whole deck'], ['fits', 'Fits the played card']].map(([k, t]) =>
  el('button.chip', { dataset: { f: k }, onclick: () => { S.techFilter = k; renderTechViewer(); } }, t)));
syncParam();

// Overlays: one at a time, except Inspect, which opens on top of a deck.
for (const o of document.querySelectorAll('.overlay')) o.addEventListener('click', e => { if (e.target === o || e.target.closest('.close')) closeOverlay(o); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(); });
for (const b of document.querySelectorAll('[data-open]')) b.onclick = () => openOverlay(b.dataset.open);
function openOverlay(name) {
  const o = $('ov-' + name); if (!o) return;
  if (name !== 'inspect') for (const x of document.querySelectorAll('.overlay:not([hidden])')) if (x !== o) x.hidden = true;
  if (o.hidden) S.opener = document.activeElement;
  o.hidden = false;
  if (name === 'algo') markAlgoViewer();
  o.querySelector('.sheet')?.focus({ preventScroll: true });
}
function closeOverlay(o = [...document.querySelectorAll('.overlay:not([hidden])')].pop()) {
  if (!o || o.hidden) return;
  o.hidden = true;
  if (!document.querySelector('.overlay:not([hidden])')) S.opener?.focus?.({ preventScroll: true });
}

// The two decks: click one to spread it out.
$('algoPileSpot').append(pile('algo', { id: 'algoPile', count: ALGOS.length, title: 'Algorithm deck: spread it out' }));
$('techPileSpot').append(pile('tech', { id: 'techPile', count: TECHS.length, title: 'Technique deck: spread it out' }));
$('algoPile').onclick = () => openOverlay('algo');
$('techPile').onclick = () => openOverlay('tech');

// Inspect: right-click any card, or its ? button.
document.addEventListener('contextmenu', e => { const c = e.target.closest('.tcg[data-kind]'); if (!c || c.closest('#inspectBody') || !['algo', 'tech'].includes(c.dataset.kind)) return; e.preventDefault(); inspect(c.dataset.kind, c.dataset.id); });
document.addEventListener('click', e => { const b = e.target.closest('.tcg-btn.peek'); if (!b) return; e.stopPropagation(); e.preventDefault(); const c = b.closest('.tcg'); if (['algo', 'tech'].includes(c.dataset.kind)) inspect(c.dataset.kind, c.dataset.id); }, true);
new ResizeObserver(() => layoutHand()).observe($('hand'));
matchMedia('(max-width: 760px)').addEventListener?.('change', () => layoutHand());

Promise.all([cardsData(), metaData(), loadData('dp-plans').then(useDpTables).catch(() => {})]).then(([c, m]) => {
  DOC = c; META = m; renderAlgoViewer(); renderPlayed(); S.handKey = ''; renderHand(); renderTechViewer();
});
readHash();
// A link pasted into the address bar (or back and forward) changes only the hash: read it again.
addEventListener('hashchange', () => { readHash(); draw(); });
{ const m = store.get('table:manual'); if (m) { $('manual').value = m; store.set('table:manual', ''); } }
renderAlgoViewer();
draw();

function syncParam() { const g = GENERATORS[$('gen').value]; $('paramWrap').style.display = g.param ? '' : 'none'; if (g.param) { $('paramName').textContent = g.param.name; if ($('param').dataset.gen !== $('gen').value) { $('param').value = g.param.def; $('param').dataset.gen = $('gen').value; } } }

// ---- input --------------------------------------------------------------------------------
function draw() {
  $('inputError').textContent = '';
  let values;
  if ($('manual').value.trim()) {
    const p = parseManual($('manual').value);
    if (p.error) { $('inputError').textContent = 'Error: ' + p.error + '. The explorer never runs on invalid input.'; S.input = null; S.result = null; board.load([], null); scoreboard(); return; }
    values = p.values;
  } else {
    const n = Math.max(0, Math.min(1000, Math.floor(+$('n').value || 0))); $('n').value = n;
    values = generate($('gen').value, n, (+$('seed').value) >>> 0, $('param').value === '' ? undefined : +$('param').value);
  }
  S.input = describe(values);
  const d = S.input;
  S.seat = routeOf(d.ranks).route;   // the real route: the mat shows the seat that sorts this stack
  S.stack = matchStack(inputKey());
  if (S.stack) S.lastStack[S.seat] = S.stack.id;
  sidePlate();
  $('inputInfo').innerHTML = `${d.n} numbers · ${messy(d.disorder)} <span class="nerdy">· disorder ${(100 * d.disorder).toFixed(2)} % (${d.regime}) · LIS ${d.lis} · ${d.runs} run${d.runs === 1 ? '' : 's'}</span>`;
  $('rankView').textContent = d.n <= 40 ? `ranks: ${d.ranks.join(' ')}` : '';
  const t = thresholds(Math.max(2, d.n)), ap = t.approx ? '~' : '';
  replay(true);
}
function inputKey() { return { n: S.input?.n ?? +$('n').value, gen: $('gen').value, param: $('param').value, seed: +$('seed').value, manual: !!$('manual').value.trim() }; }
function messy(x) { return x === 0 ? 'already sorted' : x < 0.05 ? 'barely messy' : x < 0.2 ? 'a little messy' : x < 0.4 ? 'fairly messy' : 'very messy'; }

// ---- stacks (left panel) ----------------------------------------------------------------------
// Each stack shows the current hand's moves, its stamp, and how much the last change moved it.
function stackList() {
  const box = $('stacks'); box.replaceChildren();
  for (const [level, title] of Object.entries(LEVELS)) {
    box.append(el('div.tierhead.l-' + level, {}, title));
    for (const b of STACKS.filter(x => x.level === level)) {
      const st = S.stamps[b.id], d = st?.d;
      const tip = `${b.name}: ${b.desc}` + (st?.ops != null ? `\n${b.seeds ? 'worst order: ' : ''}${st.ops} moves (${st.s})` + (d ? `, ${signed(d)} after the last change` : d === 0 ? ', unchanged by the last change' : '') : '');
      box.append(el('button', { className: `brow l-${level}${S.stack?.id === b.id ? ' on' : ''}`, title: tip, onclick: () => pickStack(b), dataset: { id: b.id } },
        el('span.disc', {}, b.icon), el('span.bname', {}, b.name), routeChip(b),
        el('span', { className: 'bdelta' + (d < 0 ? ' good' : d > 0 ? ' bad' : '') }, d ? signed(d) : ''),
        el('span.bops', {}, st?.ops != null ? f0(st.ops) : ''),
        el('span', { className: 'mark ' + (st ? stampClass(st.s) : 'none'), title: st ? (st.ops != null ? `${st.s}: ${st.ops} moves` : st.why || '') : '' }, st ? MARK[st.s] ?? '·' : '')));
    }
  }
  box.append(el('button', { className: `brow custom${S.stack ? '' : ' on'}`, onclick: () => openOverlay('input'), title: 'Set the size and shape yourself, or type your own numbers' },
    el('span.disc', {}, '✎'), el('span.bname', {}, 'Custom stack…'), el('span.bdelta'), el('span.bops'), el('span.mark.none')));   // no route: it can be anything
  stackSummary();
}
// A stack's route: its disorder, the flag that picks, and the card of that seat, which sorted it.
function flag(route) { return route === 'tiny' ? 'tiny' : '--' + route; }   // a function: start-up code calls it before a const would exist
function routeCard(b) { return seatHand(S.routes[b.id].route, b.n).algo; }
function routeChip(b) {
  const { d, route } = S.routes[b.id], a = byId[routeCard(b)];
  const why = route === 'tiny' ? `${b.n} numbers or fewer: the tiny seat, whatever the disorder` : `Disorder ${d.toFixed(3)}: ${flag(route)} (${route === 'simple' ? 'below 0.2' : route === 'medium' ? '0.2 to 0.5' : '0.5 and above'})`;
  return el('span', { className: 'route f-' + route, title: `${flag(route)}\n${why}\nSorted by ${a.name}` },
    el('span.rd', {}, d == null || route === 'tiny' ? '' : d.toFixed(2)), el('span.rflag', {}, flag(route)),   // the tiny seat ignores disorder
    el('span', { className: 'rcard fam-' + a.family, html: icon(a.family) }));
}
// The last change, weighed over every stack: where it helped and where it hurt.
function stackSummary() {
  const box = $('stackSum'), all = Object.values(S.stamps), ds = all.filter(x => x.d != null);
  const waiting = all.filter(x => x.s === '…').length;
  if (!ds.length && !waiting || !S.lastChange) { box.replaceChildren(); return; }
  const better = ds.filter(x => x.d < 0).length, worse = ds.filter(x => x.d > 0).length, same = ds.length - better - worse;
  box.replaceChildren(el('span.dim', {}, 'On every stack: '),
    better ? el('b.good', {}, `${better} better`) : '', better && (worse || same) ? ' · ' : '',
    worse ? el('b.bad', {}, `${worse} worse`) : '', worse && same ? ' · ' : '',
    same ? el('span', {}, `${same} same`) : '',
    waiting ? el('span.dim', {}, `${ds.length ? ' · ' : ''}measuring ${waiting}…`) : '');
}
function pickStack(b) {
  $('manual').value = ''; $('n').value = b.n; $('gen').value = b.gen; syncParam();
  if (b.param != null) $('param').value = b.param;
  // A set of inputs plays its worst one for its seat's hand, once known.
  $('seed').value = b.seeds ? S.known.get(handKey(seatHand(S.routes[b.id].route, b.n)))?.[b.id]?.worst ?? b.seeds[0] : SEED; draw();
}
// Clicking a seat puts it on the mat: the board moves to one of its stacks, the last one played
// there, else the first in the list.
function pickSeat(k) {
  if (k === S.seat) return;
  const b = stackById[S.lastStack[k]] || STACKS.find(x => S.routes[x.id].route === k);
  if (b) pickStack(b);
}
function sidePlate() {
  const b = S.stack;
  $('stackChip').className = 'chip-stack l-' + (b ? b.level : 'custom'); $('stackChip').textContent = b ? b.icon : '✎';
  $('stackLevel').textContent = b ? `${LEVELS[b.level]} stack` : 'Custom stack';
  $('stackName').textContent = b ? b.name : $('manual').value.trim() ? 'Your own numbers' : GENERATORS[$('gen').value].label;
  $('stackDesc').textContent = b ? b.desc : `${S.input?.n ?? '?'} numbers · ${S.input ? messy(S.input.disorder) : ''}. Change it in Custom stack.`;
  $('target').textContent = b ? goal(b) : '';
  stackList();
}
// Stamp every stack with its seat's hand, in a background lane. Results are kept per hand, so a
// change re-measures only the stacks of the seat it touched, and going back to a hand is instant.
// Every stack also shows what the last change did to it.
function stampStacks() {
  const key = JSON.stringify(SEATS.map(k => handKey(S.build[k])));
  if (key === S.stampKey) return;
  const prev = Object.fromEntries(Object.entries(S.stamps).filter(([, x]) => x.ops != null).map(([id, x]) => [id, x.ops]));
  S.stampKey = key; S.stampJob?.cancel(); S.stampJob = null; S.stamps = {};
  const todo = [], put = (b, r) => { const p = prev[b.id]; S.stamps[b.id] = { ...r, d: p != null ? r.ops - p : null }; };
  for (const b of STACKS) {
    const h = seatHand(S.routes[b.id].route, b.n), a = byId[h.algo], hk = handKey(h), R = resolve(h);
    if (a.maxN != null && b.n > a.maxN) S.stamps[b.id] = { s: '—', why: `${a.name} handles at most ${a.maxN} numbers` };
    else if (!R.ok) S.stamps[b.id] = { s: '—', why: R.errors.join(' ') };
    else if (S.known.get(hk)?.[b.id]) put(b, S.known.get(hk)[b.id]);
    else { S.stamps[b.id] = { s: '…', why: 'measuring' }; todo.push({ b, h, hk }); }
  }
  refreshStamps();
  if (!todo.length) return;
  todo.sort((x, y) => x.b.n - y.b.n);   // the long ones (n=500) can take seconds for the search cards
  const mine = S.stampJob = { cancel() { this.dead = true; this.inner?.cancel(); } };
  (async () => {
    for (const { b, h, hk } of todo) {
      if (mine.dead) return;
      mine.inner = runAll([{ kind: 'hand', hand: h, n: b.n, gen: b.gen, param: b.param, seeds: b.seeds || [SEED] }], null, 'stacks');
      try {
        // A set of inputs is stamped by its worst one, and remembers which it was.
        const [r] = await mine.inner.promise, w = r.ops.indexOf(Math.max(...r.ops)), ops = r.ops[w];
        const rec = { s: r.invalid ? 'FAIL' : stamp(b, ops), ops, worst: b.seeds ? b.seeds[w] : null };
        if (!S.known.has(hk)) S.known.set(hk, {});
        S.known.get(hk)[b.id] = rec; put(b, rec);
      }
      catch (e) { if (mine.dead) return; S.stamps[b.id] = { s: '—', why: e.message }; }
      if (!mine.dead) refreshStamps();
    }
  })();
}
function refreshStamps() { stackList(); renderBuild(); }

// ---- the build: one seat per flag, and the built-in tiny seat -------------------------------------
function seatSummary(k) {
  const mine = STACKS.filter(b => S.routes[b.id].route === k).map(b => S.stamps[b.id]).filter(Boolean);
  const count = list => mine.filter(x => list.includes(x.s)).length;
  const star = count(['EXCELLENT', 'PERFECT']), ok = count(['GOOD', 'PASS']), bad = count(['FAIL']), none = count(['—']), wait = count(['…']);
  const tally = wait ? ' · measuring…' : `${star ? ` · ${star}★` : ''}${ok ? ` ${ok}✓` : ''}${bad ? ` ${bad}✕` : ''}${none ? ` ${none}—` : ''}`;
  return { text: `${mine.length} stack${mine.length === 1 ? '' : 's'}${tally}`, weak: bad + none };
}
// Does a seat's hand meet its flag's class target (the subject's): O(n²) for --simple, O(n√n) for
// --medium, O(n log n) for --complex?
function seatClass(k) {
  const h = S.build[k], a = byId[h.algo], problems = classProblems(h), ok = meetsTarget(a.claimedClass, TARGETS[k]) && !problems.length;
  return { ok, why: ok ? `${a.name} meets ${flag(k)}'s class target, O(${TARGETS[k]})` : `${flag(k)} needs O(${TARGETS[k]}) or better: ${a.name} is ${classLabel(a.claimedClass)}${problems.length ? `\n${problems.join('; ')}` : ''}` };
}
function renderBuild() {
  const box = $('buildbar'); box.replaceChildren();
  for (const k of [...SEATS, 'tiny']) {
    const on = S.seat === k, sum = seatSummary(k);
    let card, mark, tip;
    if (k === 'tiny') {
      card = [el('span', { className: 'seatcard fam-small', html: icon('small') }), el('b.seatname', {}, 'Hardcoded Three · Oracle')];
      mark = el('span.seatlock', { html: `${icon('lock')}<span>built in</span>` });
      tip = 'The tiny seat\nBuilt in: 3 numbers or fewer take the hardcoded cases, 4 or 5 the Oracle\'s search, which is optimal.';
    } else {
      const h = S.build[k], a = byId[h.algo], c = seatClass(k);
      card = [el('span', { className: 'seatcard fam-' + a.family, html: icon(a.family) }), el('b.seatname', {}, a.name), h.techs.length ? el('span.seatplus', {}, `+${h.techs.length}`) : ''];
      mark = el('span', { className: 'seattarget ' + (c.ok ? 'ok' : 'bad'), title: c.why }, `O(${TARGETS[k]}) ${c.ok ? '✓' : '✕'}`);
      tip = `${flag(k)}: disorder ${RANGE[k]}\n${deckString(h).replace(/\+/g, ' + ')}`;
    }
    box.append(el('button', { className: `seat f-${k}${on ? ' on' : ''}${sum.weak ? ' weak' : ''}`, dataset: { seat: k }, title: tip, onclick: () => pickSeat(k) },
      el('span.seathead', {}, el('span.rflag', {}, flag(k)), el('span.seatrange', {}, RANGE[k]), mark),
      el('span.seatbody', {}, ...card, el('span.seatsum', {}, sum.text)),
      on ? el('span.seatnow', {}, `sorting: ${S.stack ? S.stack.name : 'your stack'}`) : ''));
  }
}
// The route banner above the board: this stack, why it goes where it goes, and the card it meets.
function renderRoute() {
  const box = $('route');
  if (!S.input) { box.replaceChildren(); return; }
  const { route, d } = routeOf(S.input.ranks), a = byId[S.hand.algo], n = S.input.n;
  box.className = 'routebar f-' + route;
  box.replaceChildren(
    el('b.rstack', {}, S.stack ? S.stack.name : 'Your stack'),
    el('span.rwhy', {}, route === 'tiny' ? `${n} number${n === 1 ? '' : 's'}` : `disorder ${d.toFixed(2)}`),
    el('span.rarrow', { 'aria-hidden': 'true' }, '→'),
    el('span.rflag', { html: flag(route) + (route === 'tiny' ? ` ${icon('lock')}` : '') }),
    el('span.rarrow', { 'aria-hidden': 'true' }, '→'),
    el('button', { className: 'routecard fam-' + a.family, title: `${a.name}: click to read it up close`, onclick: () => inspect('algo', a.id) }, el('span.pxi', { html: icon(a.family) }), a.name));
}

// ---- play ---------------------------------------------------------------------------------
// change: the card just added or removed, for the delta chip.
function replay(fresh = false, change = null) {
  const before = S.result && !fresh ? { ops: S.result.ops.length, grade: grade(S.input.n, S.result.ops.length), R: S.resolved } : null;
  S.resolved = resolve(S.hand);
  renderAll();
  $('runError').textContent = '';
  if (!S.input) return;
  const a = byId[S.hand.algo];
  if (!S.resolved.ok) return fail(S.resolved.errors.join(' '));
  if (a.maxN != null && S.input.n > a.maxN) return fail(`${a.name} handles at most ${a.maxN} numbers. Put another card in ${flag(S.seat)}.`);
  try { S.result = runAdaptive(S.build, S.input.ranks); }   // the build, routed: the same seat the mat shows
  catch (e) { return fail(e.message); }
  if (change) S.lastChange = change;
  if (before && change) {
    const n = S.input.n, now = S.result.ops.length;
    S.delta = { fresh: true, text: change, d: now - before.ops, g0: before.grade, g1: grade(n, now), dg: S.resolved.grasp - before.R.grasp, dc: S.resolved.craft - before.R.craft };
  } else if (fresh) S.delta = null;
  board.load(S.input.ranks, S.result);
  scoreboard(); writeHash(); pathPanel(); stampStacks();
}
function fail(msg) { $('runError').textContent = msg; S.result = null; board.load(S.input.ranks, null); scoreboard(); stampStacks(); }

function renderAll() { renderBuild(); renderRoute(); renderPlayed(); renderSlots(); renderHand(); renderTechViewer(); markAlgoViewer(); mana(); notes(); pileInfo(); }

function scoreboard() {
  const r = S.result;
  if (!r || !S.input) { $('total').textContent = '–'; $('totalShow').textContent = '–'; shown = null; $('gradeBadge').replaceChildren(); $('gradeBadge').dataset.s = ''; $('valid').textContent = ''; renderDelta(); return; }
  const n = S.input.n, ops = r.ops.length;
  const st = S.stack ? stamp(S.stack, ops) : n >= 2 ? grade(n, ops).replace('~', '') : null;
  $('total').textContent = ops; countUp(ops);
  const prevStamp = $('gradeBadge').dataset.s;
  $('gradeBadge').replaceChildren(st ? el('span.stamp.' + stampClass(st), { title: S.stack ? goal(S.stack) : thresholds(n).approx ? 'Interpolated: the subject only grades 100 and 500 numbers' : '' }, st) : '');
  $('gradeBadge').dataset.s = st || '';
  if (st && st !== prevStamp) juice($('gradeBadge').firstChild, 'stampin');
  $('valid').textContent = r.valid ? '✓ sorted, checked by an independent replay' : '✗ ' + r.error; $('valid').className = 'valid small ' + (r.valid ? 'yes' : 'no');
  renderDelta(r.removed?.filter(([, k]) => k).map(([id, k]) => `${label(id)} −${k}`).join(' · '));
}
function renderDelta(removed = '') {
  const D = S.delta, box = $('delta'); box.replaceChildren();
  if (D) {
    const chip = el('div.deltachip.' + (D.d < 0 ? 'good' : D.d > 0 ? 'bad' : 'even'), {}, el('span.dtext', {}, `${D.text}: `), el('b', {}, `${D.d === 0 ? '±0' : signed(D.d)} moves`));
    box.append(chip);
    if (D.g0 !== D.g1) box.append(el('div.small', {}, `${gradeName(D.g0)} → `, el('b', {}, gradeName(D.g1))));
    if (D.dg || D.dc) box.append(el('div.small.nerdy', {}, `Grasp ${signed(D.dg)}, Craft ${signed(D.dc)}`));
    if (D.fresh) { juice(chip, 'pop'); D.fresh = false; }
  } else box.append(el('div.small.dim', {}, 'Play or take back a card: what it changed pops up here.'));
  if (removed) box.append(el('div.small.dim', {}, `post: ${removed}`));
}
// Juice: restart a CSS animation on an element.
function calm() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
function juice(e, cls) { if (!e || calm()) return; e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); }
function countUp(to) {
  const e = $('totalShow'), from = shown;
  shown = to; cancelAnimationFrame(countTimer);
  if (from == null || calm() || from === to) { e.textContent = to; return; }
  const t0 = performance.now(), dur = 450;
  const step = now => { const k = Math.min(1, (now - t0) / dur), v = Math.round(from + (to - from) * (1 - (1 - k) ** 3)); e.textContent = v; if (k < 1) countTimer = requestAnimationFrame(step); };
  countTimer = requestAnimationFrame(step);
  juice(e, 'bump');
}
function mana() {
  const R = S.resolved; if (!R) return;
  const was = S.onFire || {};
  const row = (k, name, v, over, hint) => {
    const r = el('div', { className: 'manarow ' + k + (over ? ' onfire' : ''), title: `Hand ${name}: ${v} of 10${over ? '. Over the top: the hand is on fire!' : ''}\n${hint}` },
      el('span.mlabel', { html: `${icon(k === 'grasp' ? 'bulb' : 'hammer')}<span>${name}</span>` }),
      el('span.gems', {}, Array.from({ length: 10 }, (_, i) => el('i', { className: i < v ? 'full' : '' }))), el('b', { className: 'mval' + (over ? ' over' : '') }, v),
      over ? el('span.flames', { 'aria-hidden': 'true' }, Array.from({ length: 9 }, (_, i) => el('i', { style: { '--i': i } })), Array.from({ length: 4 }, (_, i) => el('b', { style: { '--i': i } }))) : '');
    if (over && !was[k]) requestAnimationFrame(() => juice(r, 'ignite'));   // it just caught fire
    return r;
  };
  $('mana').replaceChildren(row('grasp', 'Grasp', R.handGrasp, R.over.grasp, 'How much your hand asks you to understand.'), row('craft', 'Craft', R.handCraft, R.over.craft, 'How much your hand asks you to build.'));
  S.onFire = { grasp: R.over.grasp, craft: R.over.craft };
}
function notes() {
  const R = S.resolved;
  $('notes').textContent = [R.caveats?.length ? '~ ' + R.caveats.join(' ') : '', R.stepAside?.length ? `Default stepping aside: ${R.stepAside.map(label).join(', ')} (it conflicts with a played card).` : ''].filter(Boolean).join(' ');
}
function pileInfo() {
  const a = byId[S.hand.algo], k = handCards().length;
  $('algoPileInfo').textContent = `${ALGOS.length} cards · ${Object.keys(FAMILIES).length} families`;
  $('techPileInfo').textContent = S.seat === 'tiny' ? 'the tiny seat takes none' : `${k} in your hand for ${a.name}`;
}
// The tiny seat is built in: nothing goes in or out.
function tinyLocked() { $('handInfo').textContent = 'The tiny seat is built in: pick a stack of 6 numbers or more to work on a flag\'s hand.'; juice($('played').querySelector('.tcg'), 'nope'); }

// ---- the played card, the slots and the knobs -------------------------------------------------
function renderPlayed() {
  const a = byId[S.hand.algo], key = `${a.id}|${!!DOC}|${!!META}`;
  if (key === S.shownAlgo) return;
  const first = !S.shownAlgo;
  S.shownAlgo = key;
  const card = algoFace(a, { stats: META?.cards?.[a.id], cls: 'onmat' });
  card.onclick = e => { if (!e.target.closest('.tcg-btn')) inspect('algo', a.id); };   // click it to read it up close
  card.title = `${a.name}: click to read it up close`;
  $('played').replaceChildren(card);
  if (!first) juice(card, 'slam');
}
function emptyFace(role, text = 'empty') {
  return el('div', { className: `tcg socketcard role-${role}`, 'aria-hidden': 'true' },
    el('div.tcg-body', {}, el('div.face.front', {}, el('span.pxi', { html: icon(SLOT_ICON(role)) }), el('b', {}, SLOT_NAMES[role] || role), el('small', {}, text))));
}
function slotBox(role, card, kind, title, onClick) {
  const s = el('div', { className: `slot ${kind} role-${role}`, dataset: { role }, title: title || '' }, el('span.slotname', { html: `${icon(SLOT_ICON(role))}<span>${SLOT_NAMES[role] || role}</span>${kind === 'native' ? `<span class="tablock">${icon('lock')}</span>` : ''}` }), card);
  if (onClick) s.onclick = e => { if (e.target.closest('.tcg-btn')) return; onClick(e); };
  s.ondragover = e => { e.preventDefault(); s.classList.add('target'); };
  s.ondragleave = () => s.classList.remove('target');
  s.ondrop = e => { e.preventDefault(); s.classList.remove('target'); const id = e.dataTransfer.getData('text/plain'); if (techById[id]) playTech(id); };
  return s;
}
function plain(s) { return String(s).replace(/`/g, ''); }
// What a technique needs on the played card, and what it clashes with there.
function needsOf(t) {
  const a = byId[S.hand.algo], use = S.resolved?.use || {}, out = [];
  for (const r of t.requires || []) {
    if (typeof r === 'string') { const u = use[r]; out.push({ role: r, ok: !!u, text: u ? `needs a ${ROLE_NAMES[r]}: ${plain(label(u.id))}` : `needs a ${ROLE_NAMES[r]} card first` }); }
    else if (r.hostDefault) out.push({ role: r.role, ok: a.defaults[r.role] === r.hostDefault, text: `builds on ${plain(label(r.hostDefault))}` });
    else if (r.card) { const ok = use[r.role]?.id === r.card; out.push({ role: r.role, ok, text: `needs ${plain(label(r.card))}${ok ? '' : ' first'}` }); }
  }
  for (const c of t.conflicts || []) {
    const ct = techById[c]; if (!ct) continue;
    const isDefault = a.defaults[ct.role] === c, played = S.hand.techs.includes(c);
    if (!played && !isDefault && !fits(a, ct).ok) continue;   // a clash that cannot happen on this card
    out.push({ role: ct.role, clash: true, ok: !played, text: played ? `clashes with ${plain(label(c))}` : isDefault ? `pushes out ${plain(label(c))}` : `not with ${plain(label(c))}` });
  }
  return out;
}
// Which roles the cards in play depend on, so their slots can say "needed by …".
function neededBy() {
  const m = {};
  for (const id of activeIds()) for (const r of techById[id]?.requires || []) { if (r.hostDefault) continue; const role = typeof r === 'string' ? r : r.role; (m[role] ??= []).push(plain(label(id))); }
  return m;
}
// A chain on a slot's tab: green when another card in play relies on it, red when its own card
// is missing something.
function linkMarks(slot, t, by) {
  const needs = t ? needsOf(t).filter(x => !x.clash) : [], missing = needs.filter(x => !x.ok);
  if (!by && !needs.length) return;
  const tip = missing.length ? missing.map(x => x.text).join('; ') : [by ? `needed by ${by.join(', ')}` : '', ...needs.map(x => x.text)].filter(Boolean).join('; ');
  slot.querySelector('.slotname').append(el('span', { className: 'chain ' + (missing.length ? 'miss' : 'ok'), html: icon('link'), title: tip }));
  if (missing.length) slot.classList.add('broken');
}
function renderSlots() {
  const a = byId[S.hand.algo], R = S.resolved, box = $('slots'), nb = neededBy(); box.replaceChildren();
  if (S.seat === 'tiny') {
    box.append(el('div.tinynote', {}, el('span.pxi', { html: icon('lock') }), el('span', {}, `The tiny seat is built in: 3 numbers or fewer take the hardcoded cases, 4 or 5 the Oracle's search, which is optimal. There is nothing to tune here.`)));
    $('slotInfo').textContent = `The tiny seat: ${a.name}, built in`; $('knobs').replaceChildren();
    return;
  }
  const roles = [...Object.keys(a.natives), ...a.open.filter(r => !a.natives[r])];
  for (const role of roles) {
    const u = R.use?.[role], native = a.natives[role], t = u && techById[u.id];
    const kind = native ? 'native' : u?.source === 'played' ? 'played' : u ? 'default' : 'empty';
    const state = { native: kind === 'native', isDefault: kind === 'default', played: kind === 'played' };
    const card = t ? techFace(t, { doc: DOC?.techniques?.[u.id], state, needs: needsOf(t) }) : u ? plainFace(role, label(u.id), { native: kind === 'native' }) : emptyFace(role);
    const name = plain(label(u?.id || '')), rn = ROLE_NAMES[role];
    const title = (kind === 'native' ? `Built into ${a.name}\n${name} is what makes ${a.name} work, so it stays in.`
      : kind === 'played' ? 'Click to take it back into your hand'
      : kind === 'default' ? `${a.name}'s default ${rn}\nPlay another ${rn} card from your hand to swap it out.`
      : `${rn}: ${ROLE_HINT[role]}\nPlay ${/^[AEIOU]/.test(rn) ? 'an' : 'a'} ${rn} card from your hand.`) + (nb[role] ? `\nNeeded by ${nb[role].join(', ')}` : '');
    const s = slotBox(role, card, kind, title, kind === 'native' ? () => locked(card, `${name} is built into ${a.name}: it is what makes the card work, so it stays in.`)
      : kind === 'played' ? () => returnTech(u.id, card)
      : () => wantRole(role, kind === 'default' ? `${name} is ${a.name}'s default ${rn}. Play another ${rn} card to swap it out.` : ''));
    linkMarks(s, t, nb[role]);
    box.append(s);
  }
  if (a.finishers || a.finisher !== undefined || a.finisherNote) {
    const f = R.finisher, mine = f && S.hand.techs.includes(f.id), removable = f && !mine && a.finisher === f.id && !String(a.finisher).startsWith('built');
    const state = { native: !!f && !mine && !removable, isDefault: !!removable, played: !!mine };
    const card = f ? techFace(f, { doc: DOC?.techniques?.[f.id], state }) : a.finisherNote ? plainFace('leaf', a.finisherNote) : emptyFace('leaf');
    let click = () => wantRole('leaf'), title = 'Finisher: solves the last few numbers. Play a Finisher card from your hand.';
    if (mine) { click = () => returnTech(f.id, card); title = 'Click to take it back into your hand'; }
    else if (removable) { click = () => { S.hand.finisher = null; replay(false, `−${label(f.id)}`); }; title = 'Click to empty the Finisher slot'; }
    else if (f) { click = () => locked(card, `${plain(label(f.id))} is built into ${a.name}: it always finishes this way.`); title = `Built into ${a.name}\nIt always finishes this way.`; }
    box.append(slotBox('leaf', card, mine ? 'played' : f ? 'default' : 'empty', title, click));
  }
  // Prep and post cards take no slot: they stack in Extras.
  const extras = [...S.hand.techs.filter(x => ['prep', 'post'].includes(techById[x].role)), ...(S.hand.sharing ? ['double-op-sharing'] : [])];
  const stack = el('div.extrastack', { style: { '--k': Math.max(1, extras.length) } }, extras.length ? extras.map((id, i) => {
    const c = techFace(techById[id], { doc: DOC?.techniques?.[id], src: id === 'double-op-sharing' ? 'on' : 'played', needs: needsOf(techById[id]) });
    c.style.setProperty('--i', i);
    c.onclick = e => { if (e.target.closest('.tcg-btn')) return; e.stopPropagation(); returnTech(id, c); };
    c.title = 'Click to take it back into your hand';
    return c;
  }) : emptyFace('post', 'prep · post'));
  box.append(slotBox('extra', stack, extras.length ? 'played' : 'empty', 'Extras: prep and post cards stack here; they take no slot', extras.length ? null : () => wantRole('extra')));
  $('slotInfo').textContent = `${flag(S.seat)} · ` + (a.slots ? `${a.name} has ${a.slots} slot${a.slots === 1 ? '' : 's'} · ${R.slotsUsed} played · this is a sandbox, so play as many as you like` : `${a.name} has no open slots: try its knobs and the extras`);
  renderKnobs(a, R);
}
function renderKnobs(a, R) {
  const box = $('knobs'); box.replaceChildren(el('div.eyebrow', {}, 'Knobs'));
  const ps = Object.entries(a.params || {});
  if (!ps.length) { box.append(el('p.small.dim', {}, `${a.name} has no knobs.`)); return; }
  const n = S.input?.n ?? 100;
  for (const [k, p] of ps) {
    const cur = R.params ? R.params(n)[k] : p.def(n);
    let input;
    if (p.type === 'bool') input = el('input', { type: 'checkbox', checked: !!cur, onchange: e => { S.hand.params[k] = e.target.checked; replay(false, `${p.label}: ${e.target.checked ? 'on' : 'off'}`); } });
    else if (p.type === 'enum') input = el('select', { onchange: e => { S.hand.params[k] = e.target.value; replay(false, `${p.label}: ${p.options[e.target.value]}`); } }, Object.entries(p.options).map(([v, t]) => el('option', { value: v, selected: v === cur }, t)));
    else input = el('input', { type: 'number', value: cur, min: p.min, max: p.max, step: p.step || 1, onchange: e => { S.hand.params[k] = e.target.value === '' ? undefined : +e.target.value; delete S.hand.presets[k]; replay(false, `${p.label} = ${e.target.value}`); } });
    const row = el('label.param', {}, el('span', {}, p.label), input);
    if (p.presets) row.append(el('select', { title: 'As a function of n', onchange: e => { delete S.hand.params[k]; if (e.target.value) S.hand.presets[k] = e.target.value; else delete S.hand.presets[k]; replay(false, `${p.label}: ${e.target.value || p.formula}`); } },
      el('option', { value: '' }, `default: ${p.formula}`), Object.keys(p.presets).map(name => el('option', { value: name, selected: S.hand.presets?.[k] === name }, name))));
    if (p.grows === false && !S.hand.presets?.[k] && S.hand.params?.[k] == null && a.claimedClass === 'n√n') row.append(el('span.flag', { title: 'A constant param breaks the O(n√n) claim' }, '⚑ constant'));
    if (S.hand.params?.[k] != null && p.grows !== undefined && a.claimedClass === 'n√n') row.append(el('span.flag', { title: 'A fixed number does not grow with n' }, '⚑ fixed'));
    box.append(row);
  }
}
// Point at the hand cards that fit a slot.
// Clicking a slot that a hand card could fill: the cards that fit it wiggle. note: why the slot's
// default stays until one is played.
function wantRole(role, note = '') {
  const cards = [...$('hand').children].filter(c => role === 'extra' ? ['prep', 'post'].includes(c.dataset.role) : c.dataset.role === role);
  if (!cards.length) { $('handInfo').textContent = (role === 'extra' ? 'No prep or post card left in your hand.' : `No ${ROLE_NAMES[role]} card in your hand fits ${byId[S.hand.algo].name}.`) + (note ? ' The default stays.' : ''); return; }
  if (note) $('handInfo').textContent = note;
  for (const c of cards) juice(c, 'want');
}
// A card that cannot leave its slot says why, with a shake.
function locked(card, why) {
  $('handInfo').textContent = why; juice(card, 'nope');
}
// While a hand card is hovered or dragged: light its own slot, and the slots it needs (green when
// they are filled, red when they are not) or clashes with.
function targetSlots(t, on) {
  const slot = r => $('slots').querySelector(`.slot[data-role="${r}"]`);
  slot(['prep', 'post'].includes(t.role) ? 'extra' : t.role)?.classList.toggle('target', on);
  for (const x of needsOf(t)) {
    const s = slot(x.role); if (!s) continue;
    s.classList.remove('need-ok', 'need-miss', 'need-clash');
    if (on) s.classList.add(x.clash ? (x.ok ? 'need-ok' : 'need-clash') : x.ok ? 'need-ok' : 'need-miss');
  }
}

// ---- your hand: the technique cards that fit, fanned ---------------------------------------
function activeIds() {
  const R = S.resolved, s = new Set(S.hand.techs);
  for (const u of Object.values(R?.use || {})) s.add(u.id);
  if (R?.finisher) s.add(R.finisher.id);
  if (S.hand.sharing) s.add('double-op-sharing');
  return s;
}
function handCards() {
  if (S.seat === 'tiny') return [];
  const a = byId[S.hand.algo], active = activeIds();
  return TECHS.filter(t => !active.has(t.id) && !t.unbuildable && (t.id === 'double-op-sharing' || (!t.always && fits(a, t).ok)))
    .sort((x, y) => ORDER.indexOf(x.role) - ORDER.indexOf(y.role));
}
function effectOn(t, a) {
  const e = META?.techniques?.[t.id]?.effects?.find(x => x.host === a.id), d1 = e?.at?.[100]?.delta, d5 = e?.at?.[500]?.delta;
  if (d1 == null) return null;
  return { text: `on ${a.name}: ${signed(d1)} moves at 100${d5 != null ? `, ${signed(d5)} at 500` : ''}`, sign: d1 };
}
// The measured change in moves on this card, at the size closest to the current stack.
function badgeOf(t, a) {
  const e = META?.techniques?.[t.id]?.effects?.find(x => x.host === a.id); if (!e) return null;
  const n = (S.input?.n ?? 100) >= 300 && e.at[500] ? 500 : 100, d = e.at[n]?.delta; if (d == null) return null;
  const v = Math.round(d);
  return { text: v ? signed(v) : '±0', sub: `@${n}`, sign: v, title: `Measured on ${a.name}: ${signed(d)} moves on average at ${n} random numbers` };
}
function refreshNeeds(c, t) {
  const old = c.querySelector('.needs'), nx = needsOf(t);
  if (!old && !nx.length) return;
  const now = nx.length ? needsEl(nx) : null;
  if (old && now) old.replaceWith(now); else if (old) old.remove();
  else { const inner = c.querySelector('.tcg-inner'); inner.insertBefore(now, inner.querySelector('.tcg-effect, .tcg-src')); }
}
function renderHand() {
  const a = byId[S.hand.algo], box = $('hand'), cards = handCards(), big = (S.input?.n ?? 100) >= 300, key = `${a.id}|${!!DOC}|${!!META}|${big}`;
  if (key !== S.handKey) { S.handEls = new Map(); S.handKey = key; }
  // Deal only a new hand: cards rebuilt because the card text or stats arrived stay where they are.
  const dealKey = `${a.id}|${big}`, deal = dealKey !== S.dealKey; S.dealKey = dealKey;
  const fresh = [];
  const els = cards.map(t => {
    let c = S.handEls.get(t.id);
    if (!c) {
      const eff = effectOn(t, a);
      c = techFace(t, { doc: DOC?.techniques?.[t.id], effect: eff?.text, sign: eff?.sign, needs: needsOf(t), badge: badgeOf(t, a) });
      c.removeAttribute('title');   // a hovered hand card zooms in to be read: no tooltip over it
      c.draggable = true;
      c.ondragstart = e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; targetSlots(t, true); };
      c.ondragend = () => targetSlots(t, false);
      c.onmouseenter = () => targetSlots(t, true);
      c.onmouseleave = () => targetSlots(t, false);
      c.onfocus = () => targetSlots(t, true);
      c.onblur = () => targetSlots(t, false);
      c.onclick = e => { if (e.target.closest('.tcg-btn')) return; targetSlots(t, false); playTech(t.id, c.getBoundingClientRect()); };
      c.onkeydown = e => { if (e.key === 'Enter') { targetSlots(t, false); playTech(t.id, c.getBoundingClientRect()); } };
      c.classList.add('fresh');   // placed without the slide, so its first position is its real one
      S.handEls.set(t.id, c); fresh.push(c);
    } else refreshNeeds(c, t);
    return c;
  });
  for (const id of [...S.handEls.keys()]) if (!cards.some(t => t.id === id)) S.handEls.delete(id);
  // Keyed update: cards that stay are never detached, so they slide to their new place.
  const keep = new Set(els);
  for (const c of [...box.children]) if (!keep.has(c)) c.remove();
  els.forEach((c, i) => { if (box.children[i] !== c) box.insertBefore(c, box.children[i] || null); });
  $('handInfo').textContent = S.seat === 'tiny' ? 'The tiny seat is built in: no cards to play on it.' : cards.length ? `${cards.length} card${cards.length === 1 ? '' : 's'} fit ${a.name} in ${flag(S.seat)} · the corner shows what each one does to the moves · click one, or drag it onto a slot` : `nothing left in your hand that fits ${a.name}`;
  layoutHand();
  void box.offsetWidth;   // apply the new places now, before any flight measures them
  // Deal the new ones from the technique deck.
  const deck = $('techPile')?.getBoundingClientRect();
  if (deal && deck && fresh.length && fresh.length === els.length) fresh.forEach((c, i) => fly(c, deck, { dur: 460, delay: 28 * i }));
  else for (const c of fresh) {   // rebuilt while its deal is still in the air: show it when the flight lands
    const ghost = [...document.querySelectorAll('body > .flying')].find(g => g.dataset.id === c.dataset.id);
    if (ghost) { c.style.visibility = 'hidden'; ghost.target = c; }
  }
  requestAnimationFrame(() => fresh.forEach(c => c.classList.remove('fresh')));
}
function layoutHand() {
  const box = $('hand'), cards = [...box.children], k = cards.length;
  if (!k || matchMedia('(max-width: 760px)').matches) return;
  const pad = 18, W = box.clientWidth - 2 * pad, cw = cards[0].offsetWidth || 150, gap = 12;
  const step = k * cw + (k - 1) * gap <= W ? cw + gap : Math.max(16, (W - cw) / Math.max(1, k - 1));
  const x0 = pad + Math.max(0, (W - (step * (k - 1) + cw)) / 2), mid = (k - 1) / 2, spread = Math.min(1.2, 12 / k);
  cards.forEach((c, i) => {
    const t = k === 1 ? 0 : (i - mid) / mid;
    c.style.setProperty('--x', `${(x0 + i * step).toFixed(1)}px`);
    c.style.setProperty('--r', `${((i - mid) * spread).toFixed(2)}deg`);
    c.style.setProperty('--y', `${(t * t * 6).toFixed(1)}px`);
    c.style.setProperty('--z', i + 1);
  });
}
// A card flies from where it was to where it is now, as a copy in a layer above everything, so
// no panel hides it and no scrolling row clips it. The real card shows when the copy lands.
function fly(target, from, { dur = 440, delay = 0 } = {}) {
  if (!target || !from?.width || calm()) return;
  const to = target.getBoundingClientRect(); if (!to.width) return;
  const w = target.offsetWidth, h = target.offsetHeight, r = parseFloat(target.style.getPropertyValue('--r')) || 0;
  const ghost = target.cloneNode(true);
  ghost.classList.add('flying');
  Object.assign(ghost.style, { position: 'fixed', left: `${to.left + to.width / 2 - w / 2}px`, top: `${to.top + to.height / 2 - h / 2}px`, margin: '0', zIndex: '900', pointerEvents: 'none', transform: 'none', translate: 'none', scale: 'none', rotate: 'none', visibility: 'visible' });
  ghost.style.setProperty('--cw', `${w}px`);
  document.body.append(ghost);
  target.style.visibility = 'hidden';
  const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const anim = ghost.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${(from.width / to.width).toFixed(3)}) rotate(0deg)` },
    { transform: `translate(0px, 0px) scale(1) rotate(${r}deg)` }], { duration: dur, delay, easing: 'cubic-bezier(.2, .9, .25, 1.08)', fill: 'both' });
  ghost.target = target;   // the card it lands on; renderHand swaps it when it rebuilds the card mid-flight
  const land = () => { ghost.remove(); ghost.target.style.visibility = ''; };
  anim.onfinish = land; anim.oncancel = land;
}
// Scroll the slot row so a slot is in view before a card flies to it.
function reveal(card) {
  const row = $('slots'), slot = card.closest('.slot') || card, r = slot.getBoundingClientRect(), rr = row.getBoundingClientRect();
  if (r.left < rr.left || r.right > rr.right) row.scrollLeft += r.left - rr.left - (rr.width - r.width) / 2;
}
function playTech(id, from = null) {
  addTech(id);
  const to = $('slots').querySelector(`.tcg[data-id="${id}"]`); if (!to) return;
  reveal(to);
  if (from) fly(to, from); else juice(to, 'slam');
}
function returnTech(id, fromEl) {
  const from = fromEl?.getBoundingClientRect();
  removeTech(id);
  fly($('hand').querySelector(`.tcg[data-id="${id}"]`), from);
}
function addTech(id) {
  const t = techById[id]; if (!t) return;
  if (S.seat === 'tiny') return tinyLocked();
  const a = byId[S.hand.algo];
  if (id === 'double-op-sharing') { if (!S.hand.sharing) { S.hand.sharing = true; replay(false, '+Double-Op Sharing'); } return; }
  if (t.role === 'leaf') { S.hand.techs = S.hand.techs.filter(x => techById[x].role !== 'leaf'); delete S.hand.finisher; }
  else if (t.role !== 'prep' && t.role !== 'post') {
    const prev = S.hand.techs.find(x => techById[x].role === t.role);
    S.hand.techs = S.hand.techs.filter(x => techById[x].role !== t.role);
    const was = prev || (techById[a.defaults[t.role]] ? a.defaults[t.role] : null);
    if (a.defaults[t.role] === id) { replay(false, prev ? `${label(prev)} → ${label(id)}` : `+${label(id)}`); return; }
    if (was) { S.hand.techs.push(id); replay(false, `${label(was)} → ${label(id)}`); return; }
  }
  if (!S.hand.techs.includes(id)) S.hand.techs.push(id);
  replay(false, `+${label(id)}`);
}
function removeTech(id) {
  if (id === 'double-op-sharing') { S.hand.sharing = false; replay(false, '−Double-Op Sharing'); return; }
  S.hand.techs = S.hand.techs.filter(x => x !== id); replay(false, `−${label(id)}`);
}
// Planning time for a card at n, from the measured Meta (a power law through 100 and 500).
function planMs(id, n) {
  const at = META?.cards?.[id]?.at, a = at?.[100]?.ms; if (!a) return 0;
  const b = at[500]?.ms ?? a * 25, p = Math.log(b / a) / Math.log(5);
  return a * Math.pow(Math.max(1, n) / 100, p);
}
function busy(text) { $('busy').textContent = text; $('busy').hidden = !text; }
function play(id, from = null) {
  if (S.seat === 'tiny') return tinyLocked();
  if (id === S.hand.algo) return;
  const n = S.input?.n ?? 100, ms = planMs(id, n);
  // A slow card freezes the page while it plans: say so first, then let the browser paint.
  if (ms > 1500) { busy(`${byId[id].name} is thinking: about ${Math.round(ms / 1000)} s at ${n} numbers…`); setTimeout(() => { playNow(id, from); busy(''); }, 60); return; }
  playNow(id, from);
}
function playNow(id, from) {
  const old = S.hand;
  // Keep the cards that still fit; the rest go back with a note.
  const keep = old.techs.filter(t => { const c = techById[t]; return c.role === 'prep' || c.role === 'post' || fits(byId[id], c).ok; });
  const dropped = old.techs.filter(t => !keep.includes(t));
  S.hand = { ...old, algo: id, techs: keep, params: {}, presets: {}, finisher: undefined };
  replay(false, `${byId[id].name} in ${flag(S.seat)}${dropped.length ? ` (${dropped.map(label).join(', ')} did not fit)` : ''}`);
  if (from) fly($('played').querySelector('.tcg'), from, { dur: 520 });
}
// ---- the decks spread out (overlays) -------------------------------------------------------
function renderAlgoViewer() {
  const box = $('algoViewer'); box.replaceChildren();
  for (const [fid, fam] of Object.entries(FAMILIES)) {
    const list = ALGOS.filter(a => a.family === fid);
    box.append(el('section.vsec.fam-' + fid, { dataset: { fam: fid } },
      el('h3.vhead', { html: `${icon(fid)}<span>${fam.name}</span><span class="dim small">${FAMILY_HINT[fid] || ''}</span>` }),
      el('div.vgrid', {}, list.map(a => {
        const c = algoFace(a, { stats: META?.cards?.[a.id] });
        c.onclick = e => { if (e.target.closest('.tcg-btn') || c.classList.contains('off')) return; const r = c.getBoundingClientRect(); closeOverlay($('ov-algo')); play(a.id, r); };
        c.onkeydown = e => { if (e.key === 'Enter') c.onclick(e); };
        return c;
      }))));
  }
  $('decksView').replaceChildren(...DECKS.map(d => {
    const b = deckBox(d);
    b.onclick = () => { if (S.seat === 'tiny') return tinyLocked(); S.hand = handOf(d.hand); closeOverlay($('ov-algo')); replay(false, `${d.name} in ${flag(S.seat)}`); };
    return b;
  }));
  $('buildsView').replaceChildren(...BUILDS.map(b => {
    const box = el('button', { className: 'deckbox buildbox', dataset: { build: b.id }, title: `${b.name}: a hand in every seat` },
      el('span.lid', { html: icon('meta') }), el('b.name', {}, b.name),
      ...SEATS.map(k => el('span.dk-techs', {}, `${flag(k)}: ${plain(label(b[k].algo))}${b[k].techs.length ? ` +${b[k].techs.length}` : ''}`)),
      b.sim ? el('span.dk-num', {}, `${f0(b.sim[0])} · ${f0(b.sim[1])} moves`) : '');
    box.onclick = () => { S.build = buildOf(b); closeOverlay($('ov-algo')); replay(false, `${b.name} built`); };
    return box;
  }));
  markAlgoViewer();
}
function markAlgoViewer() {
  const n = S.input?.n;
  for (const c of $('algoViewer').querySelectorAll('.tcg.algo')) {
    const a = byId[c.dataset.id], big = a.maxN != null && n > a.maxN;
    c.classList.toggle('on', a.id === S.hand.algo); c.classList.toggle('off', big);
    c.querySelector(':scope > .tcg-banner')?.remove();
    if (big) c.append(el('div.tcg-banner', {}, `n ≤ ${a.maxN} only`));
    c.title = big ? `${a.name} handles at most ${a.maxN} numbers: pick a smaller stack first` : a.id === S.hand.algo ? 'In play' : S.seat === 'tiny' ? 'The tiny seat is built in' : `Put ${a.name} in ${flag(S.seat)}`;
  }
  $('algoTitle').textContent = S.seat === 'tiny' ? 'Algorithm deck · the tiny seat is built in' : `Algorithm deck · choosing for ${flag(S.seat)}`;
  const bs = JSON.stringify(SEATS.map(k => deckString(S.build[k])));
  for (const b of $('buildsView').children) b.classList.toggle('on', JSON.stringify(SEATS.map(k => deckString(BUILDS.find(x => x.id === b.dataset.build)[k]))) === bs);
  for (const s of $('algoViewer').querySelectorAll('.vsec')) s.hidden = S.family !== 'all' && s.dataset.fam !== S.family;
  for (const b of $('familyFilter').children) b.classList.toggle('on', b.dataset.f === S.family);
  const hs = deckString(S.hand);
  for (const b of $('decksView').children) b.classList.toggle('on', deckString(deckById[b.dataset.id].hand) === hs);
}
function renderTechViewer() {
  const a = byId[S.hand.algo], R = S.resolved, box = $('techViewer'); box.replaceChildren();
  const groups = [...ROLES.map(r => [r, TECHS.filter(t => t.role === r)]), ['leaf', TECHS.filter(t => t.role === 'leaf')], ['prep', TECHS.filter(t => t.role === 'prep')], ['post', TECHS.filter(t => t.role === 'post')]];
  let fitting = 0;
  for (const [role, list] of groups) {
    const items = list.map(t => {
      const f = fits(a, t), played = S.hand.techs.includes(t.id) || (t.id === 'double-op-sharing' && S.hand.sharing);
      const isDefault = !played && (a.defaults[t.role] === t.id || (t.role === 'leaf' && R?.finisher?.id === t.id));
      const native = a.natives[t.role] === t.id;
      const state = t.id === 'double-op-sharing' ? { ok: true, played } : t.always ? { ok: true, always: true } : native ? { ok: false, reason: 'Built into this card.', native: true, played: true } : { ...f, played, isDefault };
      const onClick = t.id === 'double-op-sharing' ? () => { S.hand.sharing = !S.hand.sharing; replay(false, `${S.hand.sharing ? '+' : '−'}Double-Op Sharing`); }
        : t.always ? null : played ? () => removeTech(t.id) : f.ok ? () => addTech(t.id) : null;
      const ok = state.ok || state.played;
      if (ok) fitting++;
      return { t, state, onClick, ok };
    }).filter(i => S.techFilter === 'all' || i.ok);
    if (!items.length) continue;
    box.append(el('section.vsec.role-' + role, {},
      el('h3.vhead', { html: `${icon(role)}<span>${role === 'leaf' ? 'Finishers' : ROLE_NAMES[role]}</span><span class="dim small">${ROLE_HINT[role]}</span>` }),
      el('div.vgrid', {}, items.map(({ t, state, onClick }) => {
        const eff = effectOn(t, a);
        const c = techFace(t, { doc: DOC?.techniques?.[t.id], state, effect: !state.ok && !state.played ? state.reason : eff?.text, sign: eff?.sign, needs: state.ok || state.played ? needsOf(t) : [] });
        if (onClick) { c.onclick = e => { if (e.target.closest('.tcg-btn')) return; onClick(); }; c.onkeydown = e => { if (e.key === 'Enter') onClick(); }; }
        return c;
      }))));
  }
  $('techTitle').textContent = `Technique deck · ${TECHS.length} cards · ${fitting} fit ${a.name}`;
  for (const b of $('techFilter').children) b.classList.toggle('on', b.dataset.f === S.techFilter);
}

// ---- inspect: a card up close, told top-down: the idea, the steps, then the technical part ----
const CLASS_WORDS = {
  '1': 'A fixed number of moves, whatever the input: it only plays tiny stacks.',
  'n log n': 'The moves grow a little faster than n: the best class a comparison sort can reach.',
  'n√n': 'The moves grow like n times its square root: between n log n and n².',
  'n²': 'The moves grow with n squared: fine at 500, slow far beyond.',
  heuristic: 'A search that plans its moves: it claims no class.',
  exponential: 'The work explodes with n: only for tiny stacks.',
};
const PROOF_WORDS = { yes: 'There is a simple worst-case proof.', avg: 'It holds on average; the worst case is unproven or worse.', no: 'The claim does not hold.' };
// A technique's labelled notes, sorted into panels: good, watch, measured, fits; the rest stays
// in Under the hood.
function splitNotes(md) {
  const text = [], notes = { good: [], watch: [], measured: [], fits: [], other: [] };
  let cur = null;
  for (const l of String(md || '').split('\n')) {
    const m = l.match(/^- \*\*([^*]+?):\*\*\s*(.*)$/);
    if (m) {
      const k = m[1], bin = k === 'Pros' ? 'good' : k === 'Cons' || k === 'Why it loses' ? 'watch' : /^(Measured|On )/.test(k) ? 'measured' : /^(Hosts|Conflicts|Requires)$/.test(k) ? 'fits' : 'other';
      cur = { label: k, text: m[2] }; notes[bin].push(cur);
    } else if (cur && /^\s{2,}\S/.test(l)) cur.text += ' ' + l.trim();
    else { cur = null; text.push(l); }
  }
  return { text: text.join('\n').trim(), notes };
}
function panel(cls, iconName, title, ...body) {
  return el('section.ipanel.' + cls, {}, el('h3.ihead', {}, el('span.iicon', { html: icon(iconName) }), el('span', {}, title)), ...body);
}
const mdBlock = (md, src) => el('div.doc', { html: markdown(md, src) });
const noteList = (items, src) => el('ul.notes', {}, items.map(x => {
  const bare = !x.label || /^(Pros|Cons)$/.test(x.label), text = bare ? x.text.replace(/^[a-z]/, c => c.toUpperCase()) : x.text;
  return el('li', { html: (bare ? '' : `<b>${esc(x.label)}:</b> `) + markdown(text, src).replace(/^<p>|<\/p>$/g, '') });
}));
const tone = d => d < -0.5 ? 'gain' : d > 0.5 ? 'loss' : 'even';
// The change in moves on one card, big: one chip per size.
const deltaChips = e => el('div.dchips', {}, [100, 500].filter(n => e.at[n]).map(n => el('span', { className: 'dchip ' + tone(e.at[n].delta) }, el('b', {}, signed(e.at[n].delta)), el('small', {}, `moves on ${n} numbers`))));
// The change in moves on every card a technique fits, the played card first.
function effectTable(id, a) {
  const rows = (META?.techniques?.[id]?.effects || []).slice().sort((x, y) => (y.host === a.id) - (x.host === a.id));
  if (!rows.length) return '';
  const cell = x => x ? el('td', { className: tone(x.delta) }, signed(x.delta)) : el('td.dim', {}, '–');
  return el('table.etable', {},
    el('thead', {}, el('tr', {}, el('th', {}, 'Played on'), el('th', {}, '100 numbers'), el('th', {}, '500 numbers'))),
    el('tbody', {}, rows.map(e => el('tr', { className: e.host === a.id ? 'here' : '' }, el('th', {}, byId[e.host]?.name || e.host), cell(e.at[100]), cell(e.at[500])))));
}
function inspect(kind, id) {
  const body = $('inspectBody'), sheet = $('ov-inspect').querySelector('.sheet');
  body.replaceChildren();
  if (kind === 'algo') {
    const a = byId[id], doc = DOC?.algorithms?.[id], st = META?.cards?.[id], sec = sections(doc?.doc || ''), src = doc?.source;
    sheet.className = `sheet inspect fam-${a.family}`;
    const face = algoFace(a, { stats: st, cls: 'focus' }); face.style.setProperty('--cw', '290px');
    $('inspectTitle').textContent = a.name;
    const canPlay = S.seat !== 'tiny' && !(a.maxN != null && S.input?.n > a.maxN);
    const actions = el('div.iactions', {},
      a.id === S.hand.algo ? el('span.inplay', {}, `In ${flag(S.seat)}`) : el('button.btn.blue', { disabled: !canPlay, title: canPlay ? '' : S.seat === 'tiny' ? 'The tiny seat is built in' : `${a.name} handles at most ${a.maxN} numbers`, onclick: () => { closeOverlay($('ov-inspect')); closeOverlay($('ov-algo')); play(id); } }, `Put in ${flag(S.seat)}`),
      el('a.btn.grey', { href: `codex.html#${id}` }, 'Codex page →'));
    const at = st?.at || {}, n1 = at[100], n5 = at[500], small = !n1 && Object.entries(at)[0];
    const t = n1 && n5 ? psTier(n1.mean, n5.mean) : null, m = modularity(a), mt = modTier(m);
    const score = panel('scorecard wide', 'curve', 'Scorecard', el('div.scores', {},
      el('div.srow', {}, el('b', { className: `sbadge cls tier-${CLASS_TIER[a.claimedClass] || 'small'}`, html: classLabel(a.claimedClass).replace('²', '<sup>2</sup>') }), el('p', {}, el('strong', {}, 'Class. '), CLASS_WORDS[a.claimedClass] || '', ' ', PROOF_WORDS[a.proof] || '')),
      el('div.srow', {}, el('b', { className: 'sbadge tier-' + mt }, mt), el('p', {}, el('strong', {}, 'Slots. '), a.slots ? `${a.slots} technique slot${a.slots === 1 ? '' : 's'}` : 'No technique slots', a.finishers?.length ? ' and a Finisher to swap' : '', `. ${m >= 3 ? 'Lots to tune.' : m ? 'A little to tune.' : 'Nothing to tune but its knobs.'}`)),
      el('div.srow', {}, el('b', { className: 'sbadge tier-' + (t || 'small') }, t || (a.maxN ? `≤${a.maxN}` : '–')), el('p', {}, el('strong', {}, 'push_swap. '),
        t ? `${f0(n1.mean)} moves on average at 100 (worst ${f0(n1.max)}) and ${f0(n5.mean)} at 500 (worst ${f0(n5.max)}). ${PS_TIER_TEXT[t]}`
          : small ? `Only for ${a.maxN} numbers or fewer: ${small[1].mean.toFixed(1)} moves on average at ${small[0]}, at most ${small[1].max}.` : 'Not measured yet.'))),
      el('p.dim.small', {}, `Grasp ${a.grasp} of 10, Craft ${a.craft} of 10: about ${a.lines} lines of C.`));
    const extra = ['Why the class holds', 'Plays as', 'Variants', 'Teaching role', 'As built (exp)'].filter(k => sec[k]);
    body.append(
      el('aside.icard', {}, face, actions),
      el('div.ipanels', {},
        panel('idea wide', 'bulb', 'The idea', el('p.big', {}, sec['The idea'] || a.tagline)),
        sec['Step by step'] ? panel('steps', 'order', 'Step by step', mdBlock(sec['Step by step'], src)) : '',
        panel('watch', 'play', 'Watch it sort 20 numbers', mini(a)),
        score,
        sec.Pros ? panel('good', 'diamond', 'Good at', mdBlock(sec.Pros, src)) : '',
        sec.Cons ? panel('bad', 'cross', 'Watch out', mdBlock(sec.Cons, src)) : '',
        sec['Under the hood'] ? panel('hood wide', 'gear', 'Under the hood', el('p.tag', {}, 'The technical part: exact rules, costs and edge cases.'), mdBlock(sec['Under the hood'], src), ...extra.map(k => [el('h4', {}, k), mdBlock(sec[k], src)])) : '',
        sec.Lore ? panel('lore', 'book', 'Lore', mdBlock(sec.Lore, src)) : '',
        sec.Slots ? panel('slotsp', 'meta', 'Slots', mdBlock(sec.Slots, src)) : ''));
  } else {
    const t = techById[id], doc = DOC?.techniques?.[id], src = doc?.source, sec = sections(doc?.doc || ''), a = byId[S.hand.algo], f = fits(a, t);
    const active = activeIds().has(id), mine = S.hand.techs.includes(id) || (id === 'double-op-sharing' && S.hand.sharing), eff = effectOn(t, a);
    const native = a.natives[t.role] === id, dflt = !mine && (a.defaults[t.role] === id || (t.role === 'leaf' && S.resolved?.finisher?.id === id));
    sheet.className = `sheet inspect role-${t.role}`;
    const face = techFace(t, { doc, state: { ...f, played: active && !native && !dflt, native, isDefault: dflt }, effect: eff?.text, sign: eff?.sign, needs: f.ok ? needsOf(t) : [] });
    face.style.setProperty('--cw', '260px'); face.classList.add('focus');
    $('inspectTitle').textContent = label(id).replace(/`/g, '');
    const { text, notes } = splitNotes(sec['Under the hood'] || '');
    const hostEff = META?.techniques?.[id]?.effects?.find(e => e.host === a.id), table = effectTable(id, a);
    const seeds = META?.seeds || { 100: 50, 500: 20 };
    const actions = el('div.iactions', {},
      mine ? el('button.btn.grey', { onclick: () => { closeOverlay($('ov-inspect')); removeTech(id); } }, 'Take it back')
        : active ? el('span.inplay', {}, 'In play') : f.ok || id === 'double-op-sharing' ? el('button.btn.blue', { onclick: () => { closeOverlay($('ov-inspect')); addTech(id); } }, `Play it on ${a.name}`) : '',
      el('a.btn.grey', { href: `codex.html#${id}` }, 'Codex page →'));
    const here = needsOf(t), lone = notes.good.length && notes.watch.length ? '' : ' wide';   // a panel without its pair spans the row
    body.append(
      el('aside.icard', {}, face, actions),
      el('div.ipanels', {},
        panel('idea wide', 'bulb', 'The idea', el('p.big', {}, sec['The idea'] || doc?.tagline || ROLE_HINT[t.role])),
        panel('here wide', t.role === 'leaf' ? 'leaf' : t.role, `On ${a.name}`,
          native ? el('p', {}, `Built into ${a.name}: it is how the card works, so it cannot be taken out.`)
            : dflt ? el('p', {}, `${a.name} comes with it, so the card's own numbers already include it. Play another ${ROLE_NAMES[t.role]} card to swap it out.`)
            : !(f.ok || id === 'double-op-sharing') ? el('p', {}, f.reason ? f.reason.replace(/^[a-z]/, c => c.toUpperCase()) : 'Does not fit here.')
            : hostEff ? [el('p', {}, `Playing it here changes the moves by:`), deltaChips(hostEff)] : el('p', {}, 'Fits here; not measured on this card yet.'),
          here.length && f.ok ? needsEl(here) : '',
          el('p.dim.small', {}, `${ROLE_NAMES[t.role]} card: ${ROLE_HINT[t.role]}. Costs +${t.grasp ?? 0} Grasp and +${t.craft ?? 0} Craft.`)),
        notes.good.length ? panel('good' + lone, 'diamond', 'Good at', noteList(notes.good, src)) : '',
        notes.watch.length ? panel('bad' + lone, 'cross', 'Watch out', noteList(notes.watch, src)) : '',
        table || notes.measured.length ? panel('measured wide', 'curve', 'Measured', table ? [el('p.tag', {}, `Moves saved (−) or added (+) against the card without it: the mean over ${seeds[100]} random stacks of 100 and ${seeds[500]} of 500.`), table] : '',
          notes.measured.length ? [el('h4', {}, 'From the study notes'), noteList(notes.measured, src)] : '') : '',
        text || notes.other.length || notes.fits.length ? panel('hood wide', 'gear', 'Under the hood', el('p.tag', {}, 'The technical part: exact rules, costs and edge cases.'), text ? mdBlock(text, src) : '', notes.other.length ? noteList(notes.other, src) : '', notes.fits.length ? noteList(notes.fits, src) : '') : ''));
  }
  openOverlay('inspect');
  $('inspectBody').scrollTop = 0;
}

// ---- Paths (opened from a Codex link: #…&path=…&step=…) --------------------------------------------------------------------
function startPath(p, i) { S.path = p; S.step = i; applyStep(); }
function applyStep() {
  const st = S.path.steps[S.step];
  if (st.meta === 'adaptive') S.build = buildOf(BUILDS.find(b => b.id === 'strong-build'));
  else fillAll({ ...parseDeck(st.deck), params: {}, presets: {} });
  if (st.n != null) { $('n').value = st.n; $('manual').value = ''; }
  if (st.gen) { $('gen').value = st.gen; syncParam(); }
  draw();
}
function pathPanel() {
  const box = $('pathPanel');
  if (!S.path) { box.hidden = true; return; }
  const p = S.path, st = p.steps[S.step]; box.hidden = false; box.innerHTML = '';
  box.append(el('div.pathhead', {}, el('span.questicon', { html: icon('book') }), el('b', {}, `Path: ${p.name}`), el('span.dim', {}, ` · step ${S.step + 1} of ${p.steps.length}`),
    el('button.ghost', { onclick: () => { S.step--; applyStep(); }, disabled: S.step === 0 }, '◀ previous'),
    el('button.ghost', { onclick: () => { S.step++; applyStep(); }, disabled: S.step >= p.steps.length - 1 }, 'next step ▶'),
    el('button.ghost', { onclick: () => { S.path = null; pathPanel(); }, title: 'Leave the path' }, '✕')),
    el('p', {}, st.q), st.link ? el('p', {}, el('a', { href: st.link }, 'Open it →')) : '', st.next ? el('p.small.dim', {}, 'Next: ' + st.next) : el('p.small.dim', {}, 'End of the path.'));
}

// ---- share link: #s=card+tech…&m=…&c=…&n=…&gen=…&seed=…&p=…, each seat's knobs as s.P.k and s.preset.k --
function writeHash() {
  if ($('manual').value.trim()) return;
  const q = new URLSearchParams();
  for (const k of SEATS) {
    const h = S.build[k], p = SEAT_KEY[k];
    q.set(p, deckString(h));
    for (const [x, v] of Object.entries(h.params || {})) if (v != null) q.set(`${p}.P.${x}`, v);
    for (const [x, v] of Object.entries(h.presets || {})) q.set(`${p}.preset.${x}`, v);
  }
  q.set('n', $('n').value); q.set('gen', $('gen').value); q.set('seed', $('seed').value);
  if (GENERATORS[$('gen').value].param) q.set('p', $('param').value);
  history.replaceState(null, '', '#' + q.toString().replace(/%2B/g, '+'));
}
function readHash() {
  const raw = location.hash.slice(1); if (!raw) return;
  const h = new URLSearchParams(raw.replace(/\+/g, '%2B'));
  const val = v => v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v;
  // An old one-hand link (#deck=…): that hand in every seat.
  const deck = h.get('deck');
  if (deck && byId[parseDeck(deck).algo]) {
    fillAll({ ...parseDeck(deck), params: {}, presets: {} });
    for (const [x, v] of h) for (const k of SEATS) { if (x.startsWith('P.')) S.build[k].params[x.slice(2)] = val(v); if (x.startsWith('preset.')) S.build[k].presets[x.slice(7)] = v; }
  }
  for (const k of SEATS) {
    const p = SEAT_KEY[k], d = h.get(p);
    if (!d || !byId[parseDeck(d).algo]) continue;
    S.build[k] = handOf({ ...parseDeck(d), params: {}, presets: {} });
    for (const [x, v] of h) { if (x.startsWith(p + '.P.')) S.build[k].params[x.slice(p.length + 3)] = val(v); if (x.startsWith(p + '.preset.')) S.build[k].presets[x.slice(p.length + 8)] = v; }
  }
  if (h.get('n')) $('n').value = h.get('n'); if (h.get('seed')) $('seed').value = h.get('seed');
  if (h.get('gen') && GENERATORS[h.get('gen')]) { $('gen').value = h.get('gen'); syncParam(); if (h.get('p') !== null) $('param').value = h.get('p'); }
  const path = PATHS.find(p => p.id === h.get('path')); if (path) { S.path = path; S.step = Math.min(path.steps.length - 1, +h.get('step') || 0); }
}
