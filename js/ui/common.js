// Shared page chrome and helpers: the top bar, the theme, element building, data and formatting.
import { loadData } from '../core/data.js';
import { thresholds } from '../core/metrics.js';

export const $ = id => document.getElementById(id);
export const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
// el('div.card.on', { title, onclick, dataset }, ...children)
export function el(spec, props = {}, ...kids) {
  const [tag, ...cls] = spec.split('.'), e = document.createElement(tag || 'div');
  if (cls.length) e.className = cls.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? e.style.setProperty(sk, sv) : (e.style[sk] = sv); }   // custom properties need setProperty
    else if (k.startsWith('on')) e[k] = v; else if (k === 'html') e.innerHTML = v; else if (k in e && k !== 'list') e[k] = v; else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
export { store };

// Top bar with the four pages and the theme toggle. Every page calls this once.
const PAGES = [['index.html', 'Table'], ['codex.html', 'Codex'], ['meta.html', 'Meta'], ['lab.html', 'Lab']];
export function topBar(current, onTheme) {
  const saved = store.get('theme'); if (saved) document.documentElement.dataset.theme = saved;
  const nav = el('nav.pages', {}, PAGES.map(([href, name]) => el('a', { href, className: name === current ? 'here' : '', 'aria-current': name === current ? 'page' : null }, name)));
  const theme = el('button.ghost', { id: 'theme', title: 'Toggle light and dark', 'aria-label': 'Toggle light and dark' }, '◐');
  theme.onclick = () => {
    const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    r.dataset.theme = dark ? 'light' : 'dark'; store.set('theme', r.dataset.theme); onTheme?.();
  };
  const bar = el('header.top', {}, el('a.brand', { href: 'index.html', title: 'Algoritro: a push_swap card table' }, el('span.logo', {}, '◆'), ' Algoritro'), nav, theme);
  document.body.prepend(bar);
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => onTheme?.());
  return bar;
}

// Data: card text and the measured Meta. Both are optional; pages degrade without them.
export const cardsData = () => loadData('cards').catch(() => null);
export const metaData = () => loadData('meta').catch(() => null);

// Formatting.
export const f0 = x => x == null ? '—' : Math.round(x).toLocaleString('en-US').replace(/,/g, ' ');
export const f1 = x => x == null ? '—' : x.toFixed(1);
export const pct = x => x == null ? '—' : `${Math.round(100 * x)} %`;
export const signed = x => x == null ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : '±'}${Number.isInteger(x) ? Math.abs(x) : Math.abs(x) < 10 ? Math.abs(x).toFixed(1) : Math.round(Math.abs(x))}`;
export const cls = c => c === '1' ? 'O(1)' : c === 'heuristic' ? 'heuristic' : c === 'exponential' ? 'exponential' : `O(${c})`;
export const proofMark = p => ({ yes: '✓', avg: '~', no: '✕' }[p] || '');
export const dots = (k, max = 5) => '●'.repeat(Math.max(0, Math.min(max, k))) + '○'.repeat(Math.max(0, max - Math.min(max, k)));
export const speedDots = ms => ms == null ? '' : dots(ms < 1 ? 5 : ms < 10 ? 4 : ms < 100 ? 3 : ms < 1000 ? 2 : 1);
export const gradeName = g => (g || '').replace('~', '');
export function badge(n, g) { return el('span.badge.' + gradeName(g), { title: thresholds(n).approx ? 'Interpolated: the subject only grades n=100 and n=500' : `The subject's threshold at n=${n}` }, g); }
// A 9-cell bar: how far a mean sits between FAIL (twice the PASS bar) and half the EXCELLENT bar.
export function gradeBar(n, mean) {
  const t = thresholds(n), lo = Math.log(t.EXCELLENT / 2), hi = Math.log(t.PASS * 2), x = (hi - Math.log(mean)) / (hi - lo);
  const k = Math.max(0, Math.min(9, Math.round(9 * x)));
  return '▮'.repeat(k) + '▯'.repeat(9 - k);
}
export const RARITY = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };
export const TIERS = { 100: [['S', 500], ['A', 700], ['B', 1500], ['C', 2000]], 500: [['S', 4000], ['A', 5500], ['B', 8000], ['C', 12000]] };
export const tier = (n, mean) => (TIERS[n].find(([, lim]) => mean < lim) || ['D'])[0];
