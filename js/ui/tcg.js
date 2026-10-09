// Trading-card faces for the Table. The anatomy borrows from familiar games:
//   Hearthstone      cost gems in the top corners (Grasp, a bulb: to understand; Craft, a hammer:
//                    to build), a rarity gem;
//   Magic            frame colour = faction (the family), a type line, the quote as flavour text,
//                    and rarity as metal (iron, silver, gold, prismatic);
//   Pokémon          shine and holo foil that get louder with rarity;
//   Slay the Spire   a coloured header band that says what kind of card it is (the role).
// An Algorithm card's cover draws its idea (covers.js), and three badges sum it up: its
// complexity class, its slot tier (how much it can be tuned) and its push_swap tier.
// Every size is in container units, so one face reads the same at any card width.
import { el, f0, RARITY } from './common.js';
import { icon } from './pixel.js';
import { cover } from './covers.js';
import { thresholds } from '../core/metrics.js';
import { FAMILIES, label } from '../cards/index.js';

export const ROLE_NAMES = { anchor: 'Anchor', pick: 'Pick', cost: 'Cost', sweep: 'Sweep', band: 'Band', retrieval: 'Retrieval', ends: 'Ends', split: 'Split', pivot: 'Pivot', order: 'Order', leaf: 'Finisher', prep: 'Prep', post: 'Post' };
export const ROLE_HINT = {
  anchor: 'what stays put in A', pick: 'which number moves next', cost: 'how a move is priced', sweep: 'which way the sweep runs',
  band: 'how values are banded in B', retrieval: 'how numbers come back from B', ends: 'which stack ends are used', split: 'how a range is split',
  pivot: 'where the pivot sits', order: 'the order the plan runs in', leaf: 'solves the last few numbers', prep: 'runs before the sort', post: 'cleans the move list afterwards',
};
const px = (name, cls = '') => el('span.pxi' + (cls ? '.' + cls : ''), { html: icon(name) });
const plainName = s => String(s).replace(/`/g, '');
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
const ICON = { grasp: 'bulb', craft: 'hammer' };
const gem = (kind, v, title) => el('span.gem.' + kind, { title }, px(ICON[kind]), el('b', {}, v));
const rgem = r => el('span.rgem.r-' + r, { title: `${RARITY[r] || r} card` });
// Rarity effects on the art: uncommon cards shine, rare and legendary ones are holo and sparkle.
function rarityFx(r) {
  if (r === 'uncommon') return el('span.shine');
  if (r === 'rare' || r === 'legendary') return [el('span.foil'), el('span.sparkles', {}, el('i'), el('i'), el('i'), el('i'))];
  return '';
}
// The legendary rim: a prismatic ring that turns. It is its own element so a transform can turn
// it, which costs no repaint.
const rim = r => r === 'legendary' ? el('span.rim') : '';
// A lesson card is kept to show why an idea loses; a research card has no reference build yet.
// Each says so with a small icon in the type line, beside the rarity gem.
function markIcon(c) {
  if (c.research) return el('span.tmark.research', { html: icon('flask'), title: 'Research\nNo reference build yet: the explorer\'s own measurements are the only ones.' });
  if (c.lesson) return el('span.tmark.lesson', { html: icon('book'), title: 'Lesson\nKept to show why this idea loses. Inspect explains.' });
  return '';
}
// The seal on a card that is built into the played card and cannot be taken out.
const lockSeal = () => el('span.lockseal', { html: icon('lock'), 'aria-label': 'built in' });

// ---- the three badges of an Algorithm card --------------------------------------------------
// A class wears the tier colours, best growth first. O(1) only plays tiny stacks, so like the
// push_swap tier of those cards it stays slate: it is not comparable.
export const CLASS_TIER = { 'n log n': 'S', 'n√n': 'A', 'n²': 'B', heuristic: 'C', exponential: 'D', '1': 'small' };
const PROOF = { yes: 'with a simple worst-case proof', avg: 'on average; the worst case is unproven or worse', no: 'but the claim does not hold' };
export const classLabel = c => c === '1' ? 'O(1)' : c === 'heuristic' ? 'search' : c === 'exponential' ? 'O(2ⁿ)' : `O(${c})`;
// The same, with real superscripts: the pixel font has no ² or ⁿ.
const classHtml = c => classLabel(c).replace('²', '<sup>2</sup>').replace('ⁿ', '<sup>n</sup>').replace('√', '<span class="rt">√</span>');
// Modularity: technique slots, plus one if the Finisher can be swapped. More is better.
export const modularity = a => (a.slots || 0) + (a.finishers?.length ? 1 : 0);
export const modTier = m => m >= 4 ? 'S' : m === 3 ? 'A' : m === 2 ? 'B' : m === 1 ? 'C' : 'D';
// push_swap tier from the measured means at 100 and 500, against the subject's bars.
export function psTier(m100, m500) {
  const t1 = thresholds(100), t5 = thresholds(500), r = Math.max(m100 / t1.EXCELLENT, m500 / t5.EXCELLENT);
  if (r <= 0.85) return 'S';
  if (r < 1) return 'A';
  if (m100 < t1.GOOD && m500 < t5.GOOD) return 'B';
  if (m100 < t1.PASS && m500 < t5.PASS) return 'C';
  return 'D';
}
export const PS_TIER_TEXT = {
  S: 'Way under the top bar at both 100 and 500.', A: 'Under the top bar at both sizes, just.', B: 'Between the top bar and the middle bar.',
  C: 'Passes, but close to failing.', D: 'Fails the pass bar at one size or both.',
};
function classBadge(a) {
  const t = classLabel(a.claimedClass);
  return el('div', { className: `badge cls tier-${CLASS_TIER[a.claimedClass] || 'small'}`, title: `Complexity class: ${t}\nClaimed ${PROOF[a.proof] || ''}.` },
    el('small', {}, 'class'), el('b', { className: t.length > 6 ? 'long' : '', html: classHtml(a.claimedClass) }));
}
function slotBadge(a) {
  const m = modularity(a), t = modTier(m);
  const what = [a.slots ? `${a.slots} technique slot${a.slots === 1 ? '' : 's'}` : 'no technique slots', a.finishers?.length ? 'a Finisher to swap' : ''].filter(Boolean).join(' and ');
  return el('div.badge.mod.tier-' + t, { title: `Slot tier ${t}\n${cap(what)}. The more slots, the more you can tune it.` },
    el('small', {}, 'slots'), el('b', {}, t), el('span.sockets', {}, Array.from({ length: Math.min(5, m) }, () => el('i'))));
}
function psBadge(a, stats) {
  const at = stats?.at || {}, n1 = at[100], n5 = at[500];
  if (!n1 || !n5) {
    const s = Object.entries(at)[0];
    return el('div.badge.ps.tier-small', { title: `push_swap tier\n${a.maxN ? `Only for ${a.maxN} numbers or fewer` : 'Not measured yet'}${s ? `: at most ${s[1].max} moves at ${s[0]}` : ''}.` },
      el('small', {}, 'push_swap'), el('b.long', {}, a.maxN ? `≤${a.maxN}` : '–'));
  }
  const t = psTier(n1.mean, n5.mean);
  return el('div.badge.ps.tier-' + t, { title: `push_swap tier ${t}\n100 numbers: ${f0(n1.mean)} moves (top bar 700)\n500 numbers: ${f0(n5.mean)} moves (top bar 5 500)\n${PS_TIER_TEXT[t]}` },
    el('small', {}, 'push_swap'), el('b', {}, t));
}

// ---- Algorithm cards ----------------------------------------------------------------------
// stats: data/meta.json's entry. There is no back: clicking a card opens it in Inspect.
export function algoFace(a, { stats, cls = '' } = {}) {
  const fam = FAMILIES[a.family] || { name: a.family };
  const front = el('div.face.front', {},
    el('div.tcg-top', {},
      gem('grasp', a.grasp, `Grasp ${a.grasp} of 10\nHow much there is to understand.`),
      el('div.nameplate', {}, el('b', { className: 'name' + (a.name.length > 15 ? ' long' : '') }, a.name)),
      gem('craft', a.craft, `Craft ${a.craft} of 10\nHow much there is to build: about ${a.lines} lines of C.`)),
    el('div.tcg-art', { html: cover(a.id) }, rarityFx(a.rarity)),
    el('div.tcg-type', {}, px(a.family), el('span.tt', {}, `${fam.name} algorithm`), markIcon(a), rgem(a.rarity)),
    el('div.tcg-text.quote', {}, el('p.flavor', {}, `“${a.tagline}”`)),
    el('div.badges', {}, classBadge(a), slotBadge(a), psBadge(a, stats)));
  const card = el('div', { className: `tcg algo fam-${a.family} r-${a.rarity}${a.research ? ' research' : ''}${a.lesson ? ' lesson' : ''}${cls ? ' ' + cls : ''}`, tabIndex: 0, dataset: { id: a.id, kind: 'algo' } },
    el('div.tcg-body', {}, rim(a.rarity), front),
    '');
  card.append(el('button.tcg-btn.peek', { title: 'Inspect', 'aria-label': `Inspect ${a.name}` }, '?'));
  return card;
}
// ---- Technique cards ----------------------------------------------------------------------
// state: { ok, reason, open, played, isDefault, native, always }; effect: plain words on the
// current host ("on Turk: −11 moves at 100"), with its sign for the colour. needs: what the card
// requires or clashes with here, each { text, ok, clash }. badge: the measured change in moves,
// shown big in the corner that stays visible in a fanned hand.
const cost = (kind, v) => el('span.cost.' + kind, { title: `+${v} ${kind === 'grasp' ? 'Grasp: more to understand' : 'Craft: more to build'}` }, px(ICON[kind]), `+${v}`);
export function techFace(t, { doc, state = {}, effect, sign = 0, src, needs = [], badge } = {}) {
  const role = t.role, name = plainName(label(t.id));
  const tag = doc?.tagline || t.tagline;
  const off = state.ok === false && !state.played;
  const front = el('div.face.front', {}, rim(t.rarity), el('div.tcg-inner', {},
    el('div.tcg-head', {}, el('span.socket', { html: icon(role) }), el('b', { className: 'name' + (name.length > 14 ? ' long' : '') }, name)),
    el('div.tcg-art', {}, px(role, 'big'), rarityFx(t.rarity)),
    el('div.tcg-type', {}, el('span.tt', {}, ROLE_NAMES[role] || role), el('span.costs', {}, t.grasp ? cost('grasp', t.grasp) : '', t.craft ? cost('craft', t.craft) : ''), markIcon(t), rgem(t.rarity)),
    el('div.tcg-text', {}, tag ? el('p.flavor', {}, `“${tag}”`) : el('p.plainhint', {}, `${cap(ROLE_HINT[role] || '')}.`), t.effect && !effect ? el('p.nerdy', {}, t.effect) : ''),
    needs.length ? needsEl(needs) : '',
    effect ? el('div.tcg-effect', { className: 'tcg-effect ' + (off ? 'why' : sign < 0 ? 'good' : sign > 0 ? 'bad' : '') }, effect) : '',
    src ? el('div.tcg-src', {}, src) : ''));
  const tip = [`${name}: ${ROLE_NAMES[role] || role}`, `${cap(ROLE_HINT[role] || '')}.`, state.reason, t.effect ? `Measured: ${t.effect}` : ''].filter(Boolean).join('\n');
  const cls = ['tcg', 'tech', 'role-' + role, 'r-' + t.rarity];
  if (state.played) cls.push('on'); if (state.isDefault) cls.push('default'); if (state.native) cls.push('native'); if (off) cls.push('off'); if (state.open) cls.push('open'); if (t.lesson) cls.push('lesson');
  const card = el('div', { className: cls.join(' '), tabIndex: 0, title: tip, dataset: { id: t.id, kind: 'tech', role } }, el('div.tcg-body', {}, front));
  if (off) card.append(el('div.tcg-banner', {}, state.open ? 'open space' : 'won’t fit'));
  else if (state.native) card.append(el('span.ribbon.native', { html: icon('lock') + ' built in' }), lockSeal());
  else if (state.always) card.append(el('span.ribbon.native', {}, 'always on'));
  else if (state.isDefault) card.append(el('span.ribbon.default', {}, 'default'));
  else if (state.played) card.append(el('span.ribbon.inplay', {}, 'in play'));
  if (badge) card.append(el('span', { className: 'fxbadge ' + (badge.sign < 0 ? 'good' : badge.sign > 0 ? 'bad' : 'even'), title: badge.title || '' }, el('b', {}, badge.text), el('small', {}, badge.sub || '')));
  card.append(el('button.tcg-btn.peek', { title: 'Inspect', 'aria-label': `Inspect ${name}` }, '?'));
  return card;
}
// What a card needs on the played card: a chain when it needs another card, a cross when it
// clashes with one. Green when it is satisfied, red when it is not.
export function needsEl(needs) {
  return el('div.needs', {}, needs.map(x => el('div', { className: 'need ' + (x.clash ? (x.ok ? 'calm' : 'clash') : x.ok ? 'ok' : 'miss'), title: x.title || x.text },
    el('span.pxi', { html: icon(x.clash ? 'cross' : 'link') }), el('span.ntext', {}, x.text), x.clash ? '' : el('b.nmark', {}, x.ok ? '✓' : '!'))));
}
// A native or default written in plain words: there is no technique card to show.
export function plainFace(role, text, { native = true } = {}) {
  const hint = native ? 'Part of the algorithm itself.' : 'Comes with the algorithm.';
  return el('div', { className: `tcg tech plain role-${role} r-common ${native ? 'native' : 'default'}`, dataset: { kind: 'plain', role }, title: `${plainName(text)}\n${hint}` },
    el('div.tcg-body', {}, el('div.face.front', {}, el('div.tcg-inner', {},
      el('div.tcg-head', {}, el('span.socket', { html: icon(role) }), el('b.name', {}, plainName(text))),
      el('div.tcg-art', {}, px(role, 'big')),
      el('div.tcg-type', {}, el('span.tt', {}, ROLE_NAMES[role] || role)),
      el('div.tcg-text', {}, el('p.plainhint', {}, hint))))),
    native ? [el('span.ribbon.native', { html: icon('lock') + ' built in' }), lockSeal()] : el('span.ribbon.default', {}, 'default'));
}

// ---- Meta cards and named decks ------------------------------------------------------------
export const META_CARDS = [
  { id: 'portfolio', name: 'Portfolio', tag: 'Run them all, keep the shortest', text: 'Plays several hands on the same input and keeps the shortest move list.' },
  { id: 'adaptive', name: 'Adaptive Selector', tag: 'Read the table, pick the deck', text: 'Measures how messy the input is, then plays a simple, medium or complex hand.' },
];
export function metaFace(m, { on = false } = {}) {
  return el('div', { className: `tcg meta r-legendary${on ? ' on' : ''}`, tabIndex: 0, dataset: { id: m.id, kind: 'meta' }, title: `${m.name}\n${m.text}` },
    el('div.tcg-body', {}, el('div.face.front', {}, rim('legendary'), el('div.tcg-inner', {},
      el('div.tcg-head', {}, el('span.socket', { html: icon('meta') }), el('b.name', {}, m.name)),
      el('div.tcg-art', {}, px('meta', 'big'), rarityFx('legendary')),
      el('div.tcg-type', {}, el('span.tt', {}, 'Meta card'), rgem('legendary')),
      el('div.tcg-text', {}, el('p.flavor', {}, `“${m.tag}”`)),
      el('div.tcg-effect.hint', {}, on ? 'in play: click to set it up' : 'wraps your whole hand')))),
    on ? el('span.ribbon.inplay', {}, 'in play') : '');
}
export function deckBox(d, { on = false } = {}) {
  const h = d.hand;
  return el('button', { className: 'deckbox' + (on ? ' on' : ''), dataset: { id: d.id }, title: d.note || '' },
    el('span.lid', { html: icon('diamond') }),
    el('b.name', {}, d.name),
    el('span.dk-algo', {}, label(h.algo)),
    el('span.dk-techs', {}, h.techs.length ? h.techs.map(id => plainName(label(id))).join(' · ') : 'no extra cards'),
    d.sim ? el('span.dk-num', {}, `${f0(d.sim[0])} · ${f0(d.sim[1])} moves`) : '');
}

// ---- Backs, piles and the book -------------------------------------------------------------
export function backFace(kind) {
  return el('div', { className: `tcg back back-${kind}`, 'aria-hidden': 'true' },
    el('div.tcg-body', {}, el('div.face.backart', {}, el('span.medallion', { html: icon(kind === 'algo' ? 'diamond' : 'gear') }), el('span.backlabel', {}, kind === 'algo' ? 'ALGORITHMS' : 'TECHNIQUES'))));
}
export function pile(kind, { id, count, title }) {
  const layers = Math.max(1, Math.min(5, Math.ceil(count / 6)));
  return el('button', { className: `pile pile-${kind}`, id, title, 'aria-label': title, style: { '--layers': layers } },
    ...Array.from({ length: layers }, (_, i) => el('span.layer', { style: { '--i': layers - 1 - i } }, backFace(kind))),
    el('span.pilecount', {}, count));
}
// ---- Juice: the foil highlight follows the pointer (the card itself stays flat and still) ----
export function bindCardFx(root = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.addEventListener('pointermove', e => {
    const c = e.target.closest?.('.tcg.r-rare, .tcg.r-legendary'), f = c?.querySelector('.foil'); if (!f) return;
    const r = c.getBoundingClientRect();
    f.style.translate = `${((.5 - (e.clientX - r.left) / r.width) * 24).toFixed(1)}% ${((.5 - (e.clientY - r.top) / r.height) * 24).toFixed(1)}%`;
  }, { passive: true });
}
