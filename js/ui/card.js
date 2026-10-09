// Card faces for the Codex (spec/02 §2.3). An Algorithm card shows its stats and a mini replay;
// its Codex page holds the rest. Technique cards are small.
import { el, cls, proofMark, dots, speedDots, gradeBar, gradeName, f0, RARITY, css } from './common.js';
import { FAMILIES, label } from '../cards/index.js';
import { runHand } from '../core/hand.js';
import { generate, ranks } from '../core/input.js';
import { grade } from '../core/metrics.js';

const ROLE_ICON = { anchor: '⚓', pick: '☝', cost: '¤', sweep: '↻', band: '≡', retrieval: '↩', ends: '⇅', split: '⫶', pivot: '✂', order: '☰', leaf: '❦', prep: '◇', post: '✎' };
export const roleIcon = r => ROLE_ICON[r] || '•';

// Mini replays share one animation loop and only animate when visible.
const minis = new Set();
let loop = false;
function animate() {
  loop = true;
  for (const m of minis) { if (!m.cv.isConnected) { minis.delete(m); continue; } if (m.visible) { m.i = (m.i + 1) % (m.states.length + 12); drawMini(m); } }
  if (minis.size) setTimeout(() => requestAnimationFrame(animate), 90); else loop = false;
}
function drawMini(m) {
  const cv = m.cv, dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const [A, B] = m.states[Math.min(m.i, m.states.length - 1)], n = m.n, rowH = (h - 4) / n, half = w / 2, dark = css('--bg').startsWith('#1');
  const bars = (s, x0) => s.forEach((v, i) => { g.fillStyle = `hsl(${(v / n) * 270 + 200} 60% ${dark ? 60 : 52}%)`; g.fillRect(x0 + 3, 2 + i * rowH, (half - 8) * (v + 1) / n, Math.max(1, rowH - 1)); });
  bars(A, 0); bars(B, half);
  g.fillStyle = css('--line'); g.fillRect(half, 2, 1, h - 4);
}
export function mini(algo) {
  const cv = el('canvas.mini', { 'aria-hidden': 'true' });
  const n = Math.min(algo.maxN || 20, 20);
  try {
    const r = ranks(generate('uniform', n, 7)), res = runHand({ algo: algo.id, techs: [], sandbox: true }, r, { keepSteps: false });
    const a = r.slice(), b = [], states = [[a.slice(), []]];
    const sw = s => { if (s.length > 1) [s[0], s[1]] = [s[1], s[0]]; }, ro = s => { if (s.length > 1) s.push(s.shift()); }, rr = s => { if (s.length > 1) s.unshift(s.pop()); };
    const stride = Math.max(1, Math.ceil(res.ops.length / 160));
    res.ops.forEach((o, i) => {
      if (o === 'pa' && b.length) a.unshift(b.shift()); else if (o === 'pb' && a.length) b.unshift(a.shift());
      if (o === 'sa' || o === 'ss') sw(a); if (o === 'sb' || o === 'ss') sw(b);
      if (o === 'ra' || o === 'rr') ro(a); if (o === 'rb' || o === 'rr') ro(b);
      if (o === 'rra' || o === 'rrr') rr(a); if (o === 'rrb' || o === 'rrr') rr(b);
      if (i % stride === 0 || i === res.ops.length - 1) states.push([a.slice(), b.slice()]);
    });
    const m = { cv, states, n, i: 0, visible: false };
    new IntersectionObserver(es => { m.visible = es[0].isIntersecting; if (m.visible) drawMini(m); }).observe(cv);
    minis.add(m); if (!loop) animate();
  } catch { /* a card that cannot run at this n has no replay */ }
  return cv;
}

// The front of an Algorithm card. stats: data/meta.json's entry for the card, if any.
export function algoCard(a, { stats, onPlay, compact = false, selected = false, disabled = '' } = {}) {
  const fam = FAMILIES[a.family] || { icon: '?', name: a.family };
  const at = (n, sim) => {
    const s = stats?.at?.[n];
    if (!s) return el('div.stat', {}, el('span.k', {}, `@${n}`), el('span.muted', {}, sim || '—'));
    return el('div.stat', { title: `${s.runs} runs: min ${s.min}, max ${s.max}, spread ${s.spread}` }, el('span.k', {}, `@${n}`), el('b', {}, f0(s.mean)), ' ', el('span.gbar', {}, gradeBar(n, s.mean)), ' ', el('span.g.' + gradeName(s.grade), {}, gradeName(s.grade)));
  };
  const small = stats && !stats.at[100] ? Object.entries(stats.at)[0] : null;
  const slots = el('span.slots', { title: `${a.slots} technique slot${a.slots === 1 ? '' : 's'}` }, '◻'.repeat(a.slots) || '—');
  const front = el('div.face.front', {},
    el('div.head', {}, el('span.fam', { title: fam.name }, fam.icon), el('b.name', {}, a.name), el('span.rarity.' + a.rarity, {}, '★ ' + RARITY[a.rarity])),
    el('div.tagline', {}, `“${a.tagline}”`),
    compact ? '' : mini(a),
    el('div.stat.nerdy', {}, el('span.k', {}, 'Class'), `${cls(a.claimedClass)} ${proofMark(a.proof)}`, stats?.classCheck?.flagged ? el('span.flag', { title: 'The growth check flags this claim' }, ' ⚑') : ''),
    small ? el('div.stat', {}, el('span.k', {}, `@${small[0]}`), el('b', {}, small[1].mean.toFixed(2)), el('span.muted', {}, ` mean · max ${small[1].max}`)) : [at(100), compact ? '' : at(500)],
    el('div.stat', { title: 'Grasp: how hard it is to understand. Craft: how hard it is to write.' }, el('span.k', {}, 'Grasp'), el('span.dots', { title: `${a.grasp} of 10` }, dots(a.grasp, 10)), ' ', el('span.k', {}, 'Craft'), el('span.dots', { title: `${a.craft} of 10` }, dots(a.craft, 10))),
    compact ? '' : el('div.stat.nerdy', {}, el('span.k', {}, 'Speed'), el('span.dots', { title: stats?.speedMs != null ? `${stats.speedMs} ms at n=${stats.speedN} (JS)` : '' }, speedDots(stats?.speedMs) || '—'), ' ', el('span.k', {}, 'Lines'), `~${a.lines}`),
    el('div.stat', {}, el('span.k', {}, 'Slots'), slots, a.maxN ? el('span.muted', {}, ` · n ≤ ${a.maxN}`) : ''));
  const card = el('div.card.algo.fam-' + a.family, { tabIndex: 0, dataset: { id: a.id }, title: disabled || '', className: `card algo fam-${a.family}${selected ? ' on' : ''}${disabled ? ' off' : ''}${a.research ? ' research' : ''}${a.lesson ? ' lesson' : ''}` }, front);
  if (onPlay) { card.onclick = e => { if (e.target.closest('a')) return; if (!disabled) onPlay(a); }; card.onkeydown = e => { if (e.key === 'Enter' && !disabled) onPlay(a); }; }
  return card;
}

// A small technique card. state: { ok, reason, caveat, played, isDefault, native }
export function techCard(t, { state = {}, doc, onClick, meta } = {}) {
  const cost = `+${t.grasp ?? 0} / +${t.craft ?? 0}`;
  const cl = ['card', 'tech', 'role-' + t.role];
  if (state.played) cl.push('on'); if (state.isDefault) cl.push('default'); if (!state.ok && !state.played) cl.push('off'); if (state.open) cl.push('open'); if (t.lesson) cl.push('lesson');
  const tip = [state.reason, state.caveat ? '~ ' + state.caveat : '', doc?.tagline ? `“${doc.tagline}”` : '', t.effect ? `Measured: ${t.effect}` : ''].filter(Boolean).join('\n');
  const c = el('div', { className: cl.join(' '), tabIndex: 0, title: tip, dataset: { id: t.id }, draggable: state.ok && !state.played ? 'true' : null },
    el('div.head', {}, el('span.roleicon', { title: t.role }, roleIcon(t.role)), el('b.name', {}, label(t.id)), state.caveat ? el('span.caveat', { title: state.caveat }, ' ~') : ''),
    el('div.meta', {}, el('span.role', {}, t.role), el('span.nerdy', { title: '+Grasp / +Craft' }, ' · ', cost), ' · ', el('span.rarity.' + t.rarity, {}, RARITY[t.rarity] || '')),
    doc?.tagline ? el('div.tagline', {}, `“${doc.tagline}”`) : '',
    meta ? el('div.effect', {}, meta) : t.effect ? el('div.effect.nerdy', {}, t.effect) : '',
    !state.ok && !state.played && state.reason ? el('div.reason', {}, state.open ? '◌ ' + state.reason : state.reason) : '');
  if (onClick) { c.onclick = () => onClick(t); c.onkeydown = e => { if (e.key === 'Enter') onClick(t); }; }
  if (state.ok && !state.played) c.ondragstart = e => { e.dataTransfer.setData('text/plain', t.id); };
  return c;
}

// A sparkline of [x, y] points.
export function sparkline(points, { w = 220, h = 40 } = {}) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const X = x => 2 + (w - 4) * (x - x0) / ((x1 - x0) || 1), Y = y => h - 12 - (h - 16) * (y - y0) / ((y1 - y0) || 1);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
  const s = el('span.spark', { html: `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="ops against disorder"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="2" y="${h - 1}" font-size="9" fill="currentColor">0</text><text x="${w - 10}" y="${h - 1}" font-size="9" fill="currentColor">1</text><text x="${w / 2 - 20}" y="${h - 1}" font-size="9" fill="currentColor">${Math.round(y0)}–${Math.round(y1)}</text></svg>` });
  return s;
}
export { grade };
