// The Lab (spec/08 §8.4): scaling, disorder map, param sweep and optimality gap, all in a Web
// Worker with progress and cancel.
import { ALGOS, byId } from '../cards/index.js';
import { DECKS, deckById } from '../cards/decks.js';
import { parseDeck, deckString, resolve } from '../core/hand.js';
import { stats, classCheck, CLASS_F, thresholds } from '../core/metrics.js';
import { growthBars, growthRatio } from './growth.js';
import { METRICS, TARGETS, meetsTarget, classProblems } from '../core/meta-run.js';
import { generate, ranks } from '../core/input.js';
import { $, el, topBar, f0, f1, cls, pct, store } from './common.js';
import { lineChart, color } from './chart.js';
import { runAll } from './worker-client.js';

topBar('Lab', () => show());
const TABS = [['scaling', 'Scaling'], ['disorder', 'Disorder map'], ['sweep', 'Param sweep'], ['gap', 'Optimality gap']];
$('tabs').append(...TABS.map(([id, t]) => el('button', { dataset: { id }, onclick: () => { location.hash = id; } }, t)));
let job = null;

// Hand pickers: named decks, bare cards, or a deck string (paste from the Table's link).
const CHOICES = [...DECKS.map(d => [`deck:${d.id}`, `${d.name} (deck)`]), ...ALGOS.map(a => [`card:${a.id}`, a.name])];
const handOf = v => v.startsWith('deck:') ? structuredClone(deckById[v.slice(5)].hand) : v.startsWith('card:') ? { algo: v.slice(5), techs: [], sandbox: true, sharing: true } : { ...parseDeck(v), sandbox: true };
const nameOf = v => CHOICES.find(c => c[0] === v)?.[1] ?? v;
function picker(def) {
  const s = el('select', {}, CHOICES.map(([v, t]) => el('option', { value: v, selected: v === def }, t)), el('option', { value: '', selected: !def }, '— none —'));
  return s;
}
function progressUI() { const bar = el('div.progress', {}, el('div')), txt = el('span.muted.small'); return { node: el('div', {}, bar, txt), set: p => { bar.firstChild.style.width = `${Math.round(100 * p)}%`; txt.textContent = p < 1 ? `${Math.round(100 * p)} %` : ''; } }; }
function runner(btn, build, done) {
  btn.onclick = () => {
    if (job) { job.cancel(); job = null; btn.textContent = 'Run'; return; }
    const { jobs, prog, after } = build(); if (!jobs.length) return;
    btn.textContent = 'Cancel';
    job = runAll(jobs, prog.set);
    job.promise.then(rs => { job = null; btn.textContent = 'Run'; prog.set(1); done(rs, after); }).catch(e => { job = null; btn.textContent = 'Run'; prog.set(0); if (e.message !== 'cancelled') { console.error(e.stack || e); alertBox(e.message); } });
  };
}
const alertBox = m => $('content').prepend(el('p.error', {}, m));

// ---- Scaling ------------------------------------------------------------------------------
function scaling() {
  const box = el('div', {}, el('p.lede', {}, 'Mean ops against n for up to four hands, with a min–max band over seeds. Reference curves are fitted to the first hand at n=100; grade thresholds are drawn. The class check fits a·f(n) + b·n on n ≤ 1000 and compares the larger sizes, if you include them.'));
  const picks = [picker('deck:the-turk'), picker('deck:four-corners'), picker('card:butterfly'), picker('')];
  const seeds = el('input', { type: 'number', value: 4, min: 1, max: 50 }), big = el('input', { type: 'checkbox' }), norm = el('select', {}, [['raw', 'ops'], ['nlogn', 'ops ÷ n log₂ n'], ['nsqrtn', 'ops ÷ n√n']].map(([v, t]) => el('option', { value: v }, t)));
  const btn = el('button', {}, 'Run'), prog = progressUI(), out = el('div');
  box.append(el('div.row', {}, ...picks.map((p, i) => el('label', {}, `hand ${i + 1} `, p))), el('div.row', {}, el('label', {}, 'seeds per n ', seeds), el('label', {}, big, ' include 2048 and 4096 (slow for n² cards)'), el('label', {}, 'plot ', norm), btn), prog.node, out);
  let last = null;
  const sizes = () => [16, 32, 64, 100, 128, 256, 500, 512, 1000, ...(big.checked ? [2048, 4096] : [])];
  runner(btn, () => {
    const hs = picks.map(p => p.value).filter(Boolean), jobs = [], meta = [];
    for (const v of hs) { const h = handOf(v), a = byId[h.algo]; for (const n of sizes()) { if (a.maxN && n > a.maxN) continue; if ((a.claimedClass === 'heuristic' || a.id === 'lookahead-greedy') && n > 500) continue; jobs.push({ kind: 'hand', hand: h, n, seeds: Array.from({ length: +seeds.value }, (_, i) => 1000 + i) }); meta.push([v, n]); } }
    return { jobs, prog, after: meta };
  }, (rs, meta) => { last = { rs, meta }; draw(); });
  norm.onchange = () => last && draw();
  function draw() {
    const { rs, meta } = last, by = {};
    rs.forEach((r, i) => { const [v, n] = meta[i]; (by[v] ??= []).push([n, stats(r.ops)]); });
    const f = norm.value === 'nlogn' ? n => n * Math.log2(n) : norm.value === 'nsqrtn' ? n => n * Math.sqrt(n) : () => 1;
    const series = Object.entries(by).map(([v, pts]) => ({ name: nameOf(v), points: pts.map(([n, s]) => [n, s.mean / f(n)]), band: pts.map(([n, s]) => [n, s.min / f(n), s.max / f(n)]) }));
    const refs = [];
    if (norm.value === 'raw') {
      const first = Object.values(by)[0], at100 = first?.find(p => p[0] === 100)?.[1].mean, ns = sizes();
      if (at100) for (const [k, g] of [['n²', n => n * n], ['n√n', n => n * Math.sqrt(n)], ['n log₂ n', n => n * Math.log2(n)]]) refs.push({ label: k, points: ns.map(n => [n, at100 * g(n) / g(100)]) });
      for (const [k, c] of [['EXCELLENT', 'var(--exc)'], ['PASS', 'var(--pass)']]) refs.push({ label: k, color: c, dash: '2 2', points: sizes().map(n => [n, thresholds(n)[k]]) });
    }
    out.replaceChildren(lineChart({ series, refs, xlog: true, ylog: norm.value === 'raw', xlabel: 'n', ylabel: norm.value === 'raw' ? 'ops' : 'normalised ops', yfmt: norm.value === 'raw' ? f0 : v => v.toFixed(2), xfmt: v => v }));
    const rows = Object.entries(by).map(([v, pts]) => {
      const h = handOf(v), a = byId[h.algo], c = CLASS_F[a.claimedClass] ? classCheck(pts.map(([n, s]) => [n, s.mean]), a.claimedClass) : null, probs = classProblems(h);
      return el('tr', {}, el('td', {}, nameOf(v)), el('td', {}, cls(a.claimedClass)), el('td', { className: c?.checks.length ? (c.flagged ? 'bad' : 'good') : 'muted' }, c?.checks.length ? `${c.flagged ? '⚑ flagged' : '✓ holds'}: ${c.checks.map(k => `n=${k.n} ${k.excess > 0 ? '+' : ''}${(100 * k.excess).toFixed(1)} %`).join(', ')}` : 'include 2048 / 4096 to check'), el('td.small.bad', {}, probs.join('; ')));
    });
    out.append(el('h3', {}, 'Class check'), el('div.tablewrap', {}, el('table.data', {}, el('tr', {}, el('th', {}, 'hand'), el('th', {}, 'claimed'), el('th', {}, 'growth check'), el('th', {}, 'params')), rows)));
    // The growth ratio: the class check as one number (the moves at 4n over the moves at n).
    const growth = Object.entries(by).map(([v, pts]) => ({ v, g: growthRatio(pts.map(([n, s]) => [n, s.mean])) })).filter(x => x.g)
      .map(({ v, g }) => ({ name: nameOf(v), cls: byId[handOf(v).algo].claimedClass, ...g }));
    if (growth.length) out.append(el('h3', {}, 'Growth ratio'), el('p.small.muted', {}, 'How many times the moves grow when n grows four times: O(n²) 16×, O(n√n) 8×, O(n log n) about 4.9×. Include 2048 for the 512 to 2048 step.'), growthBars(growth));
  }
  return box;
}

// ---- Disorder map ---------------------------------------------------------------------------
function disorder() {
  const box = el('div', {}, el('p.lede', {}, 'Mean ops against input disorder at a fixed n. Inputs are exact-disorder inputs (a random Lehmer code), easier than uniform input at the same level. Edit the thresholds: each regime\'s hand must meet that regime\'s class target, and the band shows where uniform random input falls.'));
  const saved = JSON.parse(store.get('lab:adaptive') || 'null') || { simple: 'deck:long-line', medium: 'deck:careful-crates', complex: 'deck:four-corners', low: 0.2, high: 0.5 };
  const ps = { simple: picker(saved.simple), medium: picker(saved.medium), complex: picker(saved.complex) };
  const extra = picker(''), n = el('select', {}, [100, 500].map(v => el('option', { value: v }, `n = ${v}`))), seeds = el('input', { type: 'number', value: 6, min: 1, max: 40 });
  const low = el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: saved.low }), high = el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: saved.high });
  const lowT = el('span.mono'), highT = el('span.mono'), metric = el('select', {}, Object.entries(METRICS).map(([k, m]) => el('option', { value: k }, m.name)));
  const btn = el('button', {}, 'Run'), prog = progressUI(), out = el('div'), verdict = el('div');
  box.append(el('div.row', {}, el('label', {}, 'simple ', ps.simple), el('label', {}, 'medium ', ps.medium), el('label', {}, 'complex ', ps.complex), el('label', {}, 'also ', extra)),
    el('div.row', {}, el('label', {}, n), el('label', {}, 'seeds per level ', seeds), el('label', {}, 'x axis ', metric), btn),
    el('div.row', {}, el('label', {}, 'low ', low, lowT), el('label', {}, 'high ', high, highT), el('button.ghost', { onclick: () => { low.value = 0.2; high.value = 0.5; thr(); } }, 'subject: 0.2 / 0.5')), verdict, prog.node, out);
  let last = null;
  const LEVELS = [0, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1];
  const thr = () => {
    if (+low.value > +high.value) high.value = low.value;
    lowT.textContent = (+low.value).toFixed(2); highT.textContent = (+high.value).toFixed(2);
    store.set('lab:adaptive', JSON.stringify({ simple: ps.simple.value, medium: ps.medium.value, complex: ps.complex.value, low: +low.value, high: +high.value }));
    const probs = [];
    for (const [r, p] of Object.entries(ps)) { if (!p.value) continue; const h = handOf(p.value), a = byId[h.algo]; if (!meetsTarget(a.claimedClass, TARGETS[r])) probs.push(`${r}: ${nameOf(p.value)} is ${cls(a.claimedClass)}, the target is ${cls(TARGETS[r])}`); for (const q of classProblems(h)) probs.push(`${r}: ${q}`); }
    if (+low.value === +high.value) probs.push('the medium regime is empty');
    verdict.replaceChildren(el('p', { className: probs.length ? 'bad' : 'good' }, probs.length ? '✕ ' + probs.join('; ') : '✓ every regime\'s hand meets its class target'));
    if (last) draw();
  };
  low.oninput = thr; high.oninput = thr; for (const p of Object.values(ps)) p.onchange = thr; thr();
  runner(btn, () => {
    const hs = [...new Set([ps.simple.value, ps.medium.value, ps.complex.value, extra.value].filter(Boolean))], jobs = [], meta = [];
    for (const v of hs) { const h = handOf(v), a = byId[h.algo]; if (a.maxN && +n.value > a.maxN) continue; for (const d of LEVELS) { jobs.push({ kind: 'hand', hand: h, n: +n.value, gen: 'disorder', param: d, seeds: Array.from({ length: +seeds.value }, (_, i) => 1 + i) }); meta.push([v, d]); } }
    return { jobs, prog, after: { meta, n: +n.value, seeds: +seeds.value, metric: metric.value } };
  }, (rs, after) => { last = { rs, ...after }; draw(); });
  metric.onchange = () => last && draw();
  function draw() {
    const { rs, meta, n: N, seeds: K } = last, by = {};
    // x: the chosen metric, averaged over the same inputs the hands ran on.
    const xOf = {}; for (const d of LEVELS) { let s = 0; for (let i = 1; i <= K; i++) s += METRICS[metric.value].of(ranks(generate('disorder', N, i, d))); xOf[d] = s / K; }
    rs.forEach((r, i) => { const [v, d] = meta[i]; (by[v] ??= []).push([xOf[d], stats(r.ops).mean, d]); });
    const series = Object.entries(by).map(([v, pts]) => ({ name: nameOf(v), points: pts.sort((a, b) => a[0] - b[0]) }));
    const band = metric.value === 'inversions' ? { from: 0.5 - (N === 100 ? 0.034 : 0.015), to: 0.5 + (N === 100 ? 0.034 : 0.015), label: 'uniform random input', color: 'var(--focus)', opacity: 0.18 } : null;
    out.replaceChildren(lineChart({ series, shades: band ? [band] : [], vlines: [{ x: +low.value, label: 'low' }, { x: +high.value, label: 'high' }], xlabel: METRICS[metric.value].name, ylabel: `mean ops at n=${N}`, ylog: true, yfmt: f0 }));
    // Winner per level, and who the selector would actually run.
    const levels = LEVELS.map((d, k) => { const ms = Object.entries(by).map(([v, pts]) => [v, pts.find(p => p[2] === d)?.[1]]).filter(x => x[1] != null).sort((a, b) => a[1] - b[1]); return [d, xOf[d], ms]; });
    const pick = x => x < +low.value ? 'simple' : x < +high.value ? 'medium' : 'complex';
    out.append(el('div.tablewrap', {}, el('table.data', {}, el('tr', {}, el('th.num', {}, 'd'), el('th.num', {}, 'x'), el('th', {}, 'regime'), el('th', {}, 'runs'), el('th', {}, 'cheapest'), el('th.num', {}, 'cost of the choice')),
      levels.map(([d, x, ms]) => { const r = pick(x), chosen = ps[r].value, cm = ms.find(m => m[0] === chosen)?.[1], best = ms[0]; return el('tr', {}, el('td.num', {}, d), el('td.num', {}, x.toFixed(3)), el('td', {}, r), el('td', {}, nameOf(chosen)), el('td', {}, best ? nameOf(best[0]) : ''), el('td.num', { className: 'num ' + (cm != null && best && cm > best[1] * 1.02 ? 'bad' : '') }, cm != null && best ? `${f0(cm)} (${cm > best[1] ? '+' + f0(cm - best[1]) : 'best'})` : '—')); }))));
  }
  return box;
}

// ---- Param sweep ----------------------------------------------------------------------------
function sweep() {
  const box = el('div', {}, el('p.lede', {}, 'One numeric param against mean ops: the chunk count, the window, a beam width, the bucket width.'));
  const numeric = ALGOS.flatMap(a => Object.entries(a.params || {}).filter(([, p]) => p.type === 'int' || p.type === 'num').map(([k, p]) => [`${a.id}:${k}`, `${a.name}: ${p.label}`, a, k, p]));
  const which = el('select', {}, numeric.map(([v, t]) => el('option', { value: v, selected: v === 'chunks:K' }, t)));
  const from = el('input', { type: 'number', value: 2 }), to = el('input', { type: 'number', value: 14 }), step = el('input', { type: 'number', value: 1, step: 'any' });
  const n = el('select', {}, [100, 500].map(v => el('option', { value: v }, `n = ${v}`))), seeds = el('input', { type: 'number', value: 10, min: 1, max: 100 });
  const techs = el('input', { type: 'text', placeholder: 'extra cards, e.g. one-way-sweep+second-max-lookahead', style: { minWidth: '280px' } });
  const btn = el('button', {}, 'Run'), prog = progressUI(), out = el('div');
  which.onchange = () => { const p = numeric.find(x => x[0] === which.value)[4]; from.value = p.min ?? 1; to.value = Math.min(p.max ?? 20, (p.min ?? 1) + 15); step.value = p.step || 1; };
  box.append(el('div.row', {}, el('label', {}, 'param ', which), el('label', {}, 'from ', from), el('label', {}, 'to ', to), el('label', {}, 'step ', step)), el('div.row', {}, el('label', {}, n), el('label', {}, 'seeds ', seeds), el('label', {}, 'with ', techs), btn), prog.node, out);
  runner(btn, () => {
    const [, , a, k] = numeric.find(x => x[0] === which.value), jobs = [], vals = [];
    for (let v = +from.value; v <= +to.value + 1e-9 && vals.length < 60; v += Math.max(+step.value, 1e-6)) vals.push(+v.toFixed(4));
    for (const v of vals) jobs.push({ kind: 'hand', hand: { algo: a.id, techs: techs.value.split(/[+ ,]/).filter(Boolean), sandbox: true, sharing: true, params: { [k]: v } }, n: +n.value, seeds: Array.from({ length: +seeds.value }, (_, i) => 1000 + i) });
    const R = resolve(jobs[0]?.hand || { algo: a.id }); if (jobs.length && !R.ok) { alertBox(R.errors.join(' ')); return { jobs: [], prog }; }
    return { jobs, prog, after: { vals, label: numeric.find(x => x[0] === which.value)[1], n: +n.value, a, k } };
  }, (rs, { vals, label, n: N, a, k }) => {
    const pts = rs.map((r, i) => [vals[i], stats(r.ops).mean]), band = rs.map((r, i) => { const s = stats(r.ops); return [vals[i], s.min, s.max]; });
    const best = pts.reduce((x, y) => y[1] < x[1] ? y : x), def = a.params[k].def(N);
    out.replaceChildren(lineChart({ series: [{ name: label, points: pts, band }], vlines: [{ x: def, label: `default ${f1(def)}`, dash: '4 3', color: 'var(--muted)' }], xlabel: label, ylabel: `mean ops at n=${N}`, yfmt: f0, xfmt: v => +v.toFixed(2) }),
      el('p', {}, `Best: ${k} = ${best[0]} → ${f1(best[1])} ops. Default ${a.params[k].formula || ''} = ${f1(def)} → ${f1(pts.find(p => Math.abs(p[0] - def) < 1e-9)?.[1] ?? NaN)} ops.`));
  });
  return box;
}

// ---- Optimality gap -------------------------------------------------------------------------
function gap() {
  const box = el('div', {}, el('p.lede', {}, 'For n ≤ 8, every permutation: each hand\'s op count minus the optimum. One backward BFS from the sorted state gives every permutation\'s optimum at once (362,880 states at n = 8). The worst permutations open on the Table.'));
  const pick = el('select', {}, [['card:five-hand', 'Five Hand'], ['card:min-extract', 'Min Extract'], ['card:turk', 'Turk'], ['deck:four-corners', 'Four Corners'], ['card:quick-2way', 'Quick 2-Way'], ['card:lsd-radix', 'LSD Radix'], ...CHOICES.filter(c => !['card:oracle', 'card:hardcoded-three'].includes(c[0]))].map(([v, t]) => el('option', { value: v }, t)));
  const n = el('select', {}, [3, 4, 5, 6, 7, 8].map(v => el('option', { value: v, selected: v === 5 }, `n = ${v}`)));
  const btn = el('button', {}, 'Run'), prog = progressUI(), out = el('div');
  box.append(el('div.row', {}, el('label', {}, 'hand ', pick), el('label', {}, n), btn, el('span.muted.small', {}, 'n = 8 takes a few seconds')), prog.node, out);
  runner(btn, () => {
    const h = handOf(pick.value), a = byId[h.algo];
    if (a.maxN && +n.value > a.maxN) { alertBox(`${a.name} handles at most ${a.maxN} values.`); return { jobs: [], prog }; }
    return { jobs: [{ kind: 'gap', hand: h, n: +n.value }], prog, after: { name: nameOf(pick.value), n: +n.value } };
  }, ([r], { name, n: N }) => {
    const keys = Object.keys(r.hist).map(Number).sort((a, b) => a - b), mx = Math.max(...Object.values(r.hist));
    const W = 640, H = 200, bw = Math.min(60, (W - 40) / keys.length);
    let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Histogram of extra ops">`;
    keys.forEach((k, i) => { const c = r.hist[k], bh = (H - 40) * c / mx, x = 30 + i * bw; svg += `<rect x="${x}" y="${H - 22 - bh}" width="${bw - 4}" height="${bh}" fill="${k === 0 ? 'var(--exc)' : 'var(--accent)'}"><title>${c} permutations need ${k} extra ops</title></rect><text x="${x + bw / 2 - 6}" y="${H - 8}">+${k}</text><text x="${x}" y="${H - 26 - bh}">${c}</text>`; });
    out.replaceChildren(el('p', {}, `${name}, n = ${N}: ${r.count} permutations, mean ${r.mean.toFixed(3)} extra ops over the optimum; optimal on ${r.hist[0] || 0} (${pct((r.hist[0] || 0) / r.count)}).`),
      el('div', { html: svg + '</svg>' }), el('p.muted.small', {}, 'x: extra ops beyond the Oracle; y: how many permutations.'),
      el('h3', {}, 'Worst permutations'), el('ul', {}, r.worst.map(([p, k]) => el('li', {}, el('code', {}, p.join(' ')), ` +${k} extra ops · `, el('a', { href: `index.html#deck=${pick.value.split(':')[0] === 'deck' ? deckString(deckById[pick.value.slice(5)].hand) : pick.value.slice(5)}&n=${N}`, onclick: () => store.set('table:manual', p.join(' ')) }, 'open on the Table')))));
  });
  return box;
}

const RENDER = { scaling, disorder, sweep, gap };
function show() {
  const id = RENDER[location.hash.slice(1)] ? location.hash.slice(1) : 'scaling';
  for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.id === id);
  if ($('content').dataset.tab !== id) { $('content').dataset.tab = id; $('content').replaceChildren(RENDER[id]()); }
}
addEventListener('hashchange', show); show();
