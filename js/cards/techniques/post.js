// Post cards rewrite the finished list of steps ({ op, phase, why, … }). They stack, run in the
// order played and use no slot. Double-Op Sharing acts as each move is emitted, so it is a flag
// the engines read rather than a rewrite.

const INV = { ra: 'rra', rra: 'ra', rb: 'rrb', rrb: 'rb', rr: 'rrr', rrr: 'rr', pa: 'pb', pb: 'pa', sa: 'sa', sb: 'sb', ss: 'ss' };
const FUSE = { 'ra|rb': 'rr', 'rb|ra': 'rr', 'rra|rrb': 'rrr', 'rrb|rra': 'rrr', 'sa|sb': 'ss', 'sb|sa': 'ss' };

// No-op Suppression: drop ops that change nothing at the moment they are emitted, and record an
// rr / rrr / ss with one idle half as the single half.
export function noop(steps, input) {
  let la = input.length, lb = 0; const out = [];
  for (const s of steps) {
    const o = s.op;
    if (o === 'rr' || o === 'rrr' || o === 'ss') {
      const ia = la < 2, ib = lb < 2;
      if (ia && ib) continue;
      if (ia || ib) { const half = o === 'ss' ? (ia ? 'sb' : 'sa') : o === 'rr' ? (ia ? 'rb' : 'ra') : (ia ? 'rrb' : 'rra'); out.push({ ...s, op: half }); continue; }
      out.push(s); continue;
    }
    const idle = /^(sa|ra|rra)$/.test(o) ? la < 2 : /^(sb|rb|rrb)$/.test(o) ? lb < 2 : o === 'pa' ? lb === 0 : la === 0;
    if (idle) continue;
    if (o === 'pa') { la++; lb--; } else if (o === 'pb') { la--; lb++; }
    out.push(s);
  }
  return out;
}
// Peephole Cancel: stack-based, so cascades cancel.
export const cancel = steps => { const out = []; for (const s of steps) { const t = out[out.length - 1]; if (t && INV[t.op] === s.op) out.pop(); else out.push(s); } return out; };
// Peephole Fuse: merge adjacent halves.
export const fuse = steps => { const out = []; for (const s of steps) { const t = out[out.length - 1], f = t && FUSE[t.op + '|' + s.op]; if (f) out[out.length - 1] = { ...s, op: f, why: `fused ${t.op} + ${s.op}` }; else out.push(s); } return out; };

// Commutation Peephole: an A-only op can slide past B-only ops (and the reverse) to meet its
// inverse or its other half, within a window of w ops. A cancellation is tried first.
const SIDE = { sa: 'A', ra: 'A', rra: 'A', sb: 'B', rb: 'B', rrb: 'B' };
const PAIR = { 'ra|rra': '', 'rra|ra': '', 'rb|rrb': '', 'rrb|rb': '', 'sa|sa': '', 'sb|sb': '',
  'ra|rb': 'rr', 'rb|ra': 'rr', 'rra|rrb': 'rrr', 'rrb|rra': 'rrr', 'sa|sb': 'ss', 'sb|sa': 'ss' };
export function commute(steps, w = 8) {
  const out = steps.slice();
  const find = (i, cancel) => {
    const s = SIDE[out[i].op];
    for (let j = i + 1; j < out.length && j <= i + w; j++) {
      const k = out[i].op + '|' + out[j].op;
      if (k in PAIR && (PAIR[k] === '') === cancel) return j;
      const t = SIDE[out[j].op]; if (!t || t === s) return -1;
    }
    return -1;
  };
  for (let i = 0; i < out.length; i++) {
    if (!SIDE[out[i].op]) continue;
    let j = find(i, true);
    const isCancel = j >= 0;
    if (!isCancel) j = find(i, false);
    if (j < 0) continue;
    if (isCancel) { out.splice(j, 1); out.splice(i, 1); }
    else { out[j] = { ...out[j], op: PAIR[out[i].op + '|' + out[j].op], why: `commuted and fused ${out[i].op} + ${out[j].op}` }; out.splice(i, 1); }
    i = Math.max(-1, i - w - 1);
  }
  return out;
}

export default [
  { id: 'double-op-sharing', role: 'post', name: 'Double-Op Sharing', grasp: 0, craft: 2, rarity: 'common', always: true, flag: 'sharing',
    effect: 'switched off: Turk +98 @100, +1224 @500; Long Line +69 / +852' },
  { id: 'noop-suppression', role: 'post', name: 'No-op Suppression', grasp: 0, craft: 0, rarity: 'common', rewrite: noop,
    effect: 'under 0.5 op per stream on every card' },
  { id: 'peephole-cancel', role: 'post', name: 'Peephole Cancel', grasp: 0, craft: 2, rarity: 'uncommon', rewrite: s => cancel(s),
    effect: 'Radix −78 @100, −55 @500; Turk and LIS hosts < 1' },
  { id: 'peephole-fuse', role: 'post', name: 'Peephole Fuse', grasp: 0, craft: 2, rarity: 'uncommon', rewrite: s => fuse(s),
    effect: 'Chunks −17 / −106; Butterfly −20 / −166; with Cancel on Four-End Quicksort −33 / −217' },
  { id: 'commutation-peephole', role: 'post', name: 'Commutation Peephole', grasp: 2, craft: 4, rarity: 'rare', rewrite: s => commute(s),
    effect: 'after Cancel + Fuse: ~0 on every card' },
].map(c => ({ kind: 'technique', requires: [], conflicts: [], ...c }));
