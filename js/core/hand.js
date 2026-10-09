// Builds a runnable pipeline from a hand: prep cards, one Algorithm card with its slots and
// Finisher, post cards in order. The rules are spec/04-compatibility.md.
import { Machine } from './machine.js';
import { replay } from './replay.js';
import { byId, techById, label } from '../cards/index.js';

// A hand: { algo, techs: [ids], finisher: id | null | undefined (the default), params: {},
//           sharing: true, sandbox: true }. techs may hold slot, leaf, prep and post cards.

// Why a role is closed on a host (spec/04 §4.2).
export function closedReason(algo, role) {
  if (algo.family === 'digit') return 'Radix never chooses which value to move or where it lands, and never prices a rotation. Every value is visited once per digit.';
  if (!algo.open.length) return 'This card has no technique role. Its knobs are params, such as the search variant or the beam width.';
  if (algo.family === 'selection' && role === 'cost') return 'A selection card has one candidate per step: the min (or max). There is nothing to compare.';
  if (algo.id === 'butterfly' && role === 'anchor') return 'The window rule pushes every value. An anchor has nothing to keep.';
  if (algo.id === 'butterfly' && role === 'sweep') return 'The window rule is the card: it decides which value is pushed next.';
  if (algo.family === 'divide' && (role === 'sweep' || role === 'band')) return 'Divide cards place values through their ends, split and pivot roles.';
  if (algo.natives[role]) return `${role} is native on ${algo.name}: ${label(algo.natives[role])}, locked.`;
  return `${algo.name} has no ${role} role.`;
}

// Can technique t be played on algo at all? → { ok, reason, caveat }
export function fits(algo, t) {
  if (t.role === 'prep' || t.role === 'post') return t.always ? { ok: false, reason: 'Always on.' } : { ok: true };
  if (t.role === 'leaf') {
    if (!algo.finishers?.includes(t.id)) return { ok: false, reason: algo.finisherNote ? `Finisher: ${algo.finisherNote}.` : `${algo.name} takes no Finisher${algo.finishers ? ' of this kind' : ''}.` };
    if (t.unbuildable) return { ok: false, reason: t.unbuildable, open: true };
    return { ok: true };
  }
  if (!algo.open.includes(t.role)) return { ok: false, reason: closedReason(algo, t.role) };
  if (t.unbuildable) return { ok: false, reason: t.unbuildable };
  if (!t.hosts.includes(algo.id)) {
    if (algo.caveats?.[t.role]) return { ok: false, reason: `${algo.caveats[t.role]} Not built in the explorer yet.`, open: true };
    return { ok: false, reason: `Not built on ${algo.name} yet: an open space.`, open: true };
  }
  return { ok: true, caveat: algo.caveats?.[t.role] };
}

const isCard = id => !!techById[id];

export function resolve(hand) {
  const errors = [], caveats = [];
  const algo = byId[hand.algo];
  if (!algo) return { ok: false, errors: [`unknown algorithm ${hand.algo}`] };
  const use = {}, played = [], prep = [], post = [];
  for (const [role, id] of Object.entries(algo.natives)) use[role] = { id, source: 'native' };
  let finisherId = hand.finisher === undefined ? (algo.finisher && algo.finisher !== 'built-in' ? algo.finisher : null) : hand.finisher;
  for (const id of hand.techs || []) {
    const t = techById[id];
    if (!t) { errors.push(`unknown card ${id}`); continue; }
    if (t.role === 'leaf') { finisherId = id; continue; }
    const f = fits(algo, t);
    if (t.role === 'prep') { if (!t.always) prep.push(t); continue; }
    if (t.role === 'post') { if (!t.always) post.push(t); continue; }
    if (!f.ok) { errors.push(`${t.name}: ${f.reason}`); continue; }
    if (f.caveat) caveats.push(`${t.name}: ${f.caveat}`);
    if (use[t.role]?.source === 'played') { errors.push(`${t.name} and ${label(use[t.role].id)} both fill the ${t.role} role.`); continue; }
    use[t.role] = { id, source: 'played' }; played.push(t);
  }
  // Played-against-played conflicts; a default that conflicts with a played card steps aside.
  for (const t of played) for (const c of t.conflicts) if (played.some(p => p.id === c)) {
    if (t.id < c) errors.push(`${t.name} conflicts with ${label(c)}.`);
  }
  const conflictsWithPlayed = id => played.some(p => p.conflicts.includes(id) || techById[id]?.conflicts.includes(p.id));
  const stepAside = [];
  for (const [role, id] of Object.entries(algo.defaults)) {
    if (use[role]) continue;
    if (isCard(id) && conflictsWithPlayed(id)) { stepAside.push(id); continue; }
    use[role] = { id, source: 'default' };
  }
  // Requires.
  for (const t of played) for (const r of t.requires) {
    if (typeof r === 'string') { if (!use[r]) errors.push(`${t.name} needs a ${r} card, played or native.`); }
    else if (r.hostDefault) { if (algo.defaults[r.role] !== r.hostDefault) errors.push(`${t.name} replaces ${label(r.hostDefault)}, which ${algo.name} does not use.`); }
    else if (r.card && use[r.role]?.id !== r.card) errors.push(`${t.name} needs ${label(r.card)}.`);
  }
  // Finisher.
  let finisher = null;
  if (finisherId) {
    const t = techById[finisherId];
    const f = t ? fits(algo, t) : { ok: false, reason: `unknown card ${finisherId}` };
    if (!f.ok) errors.push(`${t ? t.name : finisherId}: ${f.reason}`); else finisher = t;
  }
  // Slots: cards played into slot roles, not counting a default played again.
  const slotsUsed = played.filter(t => algo.defaults[t.role] !== t.id).length;
  if (!hand.sandbox && slotsUsed > algo.slots) errors.push(`${algo.name} has ${algo.slots} slot${algo.slots === 1 ? '' : 's'}; this hand uses ${slotsUsed}. Sandbox removes the limit.`);
  // Options for the engine: natives and defaults first, then played cards.
  const opt = { sharing: hand.sharing !== false };
  for (const src of ['native', 'default', 'played']) for (const u of Object.values(use)) if (u.source === src && isCard(u.id)) Object.assign(opt, techById[u.id].hook);
  const why = algo.unbuilt?.(opt, finisher);
  if (why) errors.push(why);
  // Params: declared as functions of n; numbers in hand.params override them.
  const params = n => Object.fromEntries(Object.entries(algo.params).map(([k, p]) => [k, hand.params?.[k] ?? (p.presets && hand.presets?.[k] ? p.presets[hand.presets[k]](n) : p.def(n))]));
  // Hand totals (spec/03 §3.4): the Algorithm's scores plus the added costs of played cards, on a
  // 0–10 scale. A hand can go past 10; the totals are not capped, only flagged.
  const added = [...played, ...prep, ...post, ...(finisher && finisherId !== algo.finisher ? [finisher] : [])];
  const grasp = algo.grasp + added.reduce((s, t) => s + (t.grasp || 0), 0), craft = algo.craft + added.reduce((s, t) => s + (t.craft || 0), 0);
  return { ok: errors.length === 0, errors, caveats, algo, use, played, finisher, prep, post, opt, params, slotsUsed, stepAside,
    grasp, craft, handGrasp: grasp, handCraft: craft, over: { grasp: grasp > 10, craft: craft > 10 } };
}

export function runHand(hand, ranks, { keepSteps = true } = {}) {
  const R = resolve(hand);
  if (!R.ok) throw new Error(R.errors.join(' '));
  const algo = R.algo, n = ranks.length;
  if (algo.maxN != null && n > algo.maxN) throw new Error(`${algo.name} handles at most ${algo.maxN} values`);
  const t0 = (globalThis.performance ?? Date).now();
  const m = new Machine(ranks, { lean: !keepSteps }), info = {};
  let handled = false;
  for (const t of R.prep) if (t.prepare(m, info)) { handled = true; break; }
  if (!handled) algo.run(m, { opt: R.opt, finisher: R.finisher || defaultFinisher(algo), params: R.params(n), n });
  let steps = keepSteps ? m.steps : R.post.length ? m.ops.map(op => ({ op })) : null; const removed = [];
  for (const t of R.post) { const before = steps.length; steps = t.rewrite(steps, ranks); removed.push([t.id, before - steps.length]); }
  const ms = (globalThis.performance ?? Date).now() - t0;
  const ops = steps ? steps.map(s => s.op) : m.ops, check = replay(ranks, ops);
  return { ops, steps: keepSteps ? steps : null, ms, valid: check.ok, error: check.error, removed, resolved: R, info };
}
// Hosts that need a Finisher to sort their last values fall back to their default.
function defaultFinisher(algo) { return algo.finisher && algo.finisher !== 'built-in' ? techById[algo.finisher] : null; }

// Deck strings: "turk+rb-sink+peephole-cancel". "no-sharing" switches Double-Op Sharing off and
// "no-finisher" empties the Finisher slot.
export function parseDeck(s) {
  const parts = s.split(/[+ ]/).filter(Boolean);
  const hand = { algo: parts[0], techs: [], sharing: true, sandbox: true };
  for (const p of parts.slice(1)) {
    if (p === 'no-sharing') hand.sharing = false;
    else if (p === 'no-finisher') hand.finisher = null;
    else hand.techs.push(p);
  }
  return hand;
}
export function deckString(hand) {
  return [hand.algo, ...(hand.techs || []), ...(hand.finisher === null ? ['no-finisher'] : []), ...(hand.sharing === false ? ['no-sharing'] : [])].join('+');
}
