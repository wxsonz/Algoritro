// Leaf solving, shared by the Finishers and the Divide cards. Ported from spec/sim/divide.mjs.

// The four locations: the top and bottom of A and of B.
export const TA = 0, BA = 1, TB = 2, BB = 3;
export const LOC = ['top of A', 'bottom of A', 'top of B', 'bottom of B'];
// SEQ[from][to]: the ops that move one value between two ends.
export const SEQ = [
  [[], ['ra'], ['pb'], ['pb', 'rb']],
  [['rra'], [], ['rra', 'pb'], ['rra', 'pb', 'rb']],
  [['pa'], ['pa', 'ra'], [], ['rb']],
  [['rrb', 'pa'], ['rrb', 'pa', 'ra'], ['rrb'], []],
];
export const MC = SEQ.map(row => row.map(s => s.length));

const OPS = ['sa', 'sb', 'ss', 'pa', 'pb', 'ra', 'rb', 'rr', 'rra', 'rrb', 'rrr'];
// BFS Leaf: the k values of a leaf sit at one end; everything else on each stack is a fixed wall
// the search may not reorder. wA / wB say whether stack A / B holds other values. The result is
// a shortest op list that leaves the leaf sorted on top of A, walls untouched.
const leafCache = new Map();
export function bfsLeaf(loc, wA, wB, rel) {
  const key = `${loc}|${+wA}|${+wB}|${rel.join(',')}`;
  if (leafCache.has(key)) return leafCache.get(key);
  const seg = [[], [], [], []]; seg[loc] = rel.slice();
  if (!wA) { seg[TA] = seg[TA].concat(seg[BA]); seg[BA] = []; }
  if (!wB) { seg[TB] = seg[TB].concat(seg[BB]); seg[BB] = []; }
  const goal = rel.slice().sort((a, b) => a - b).join(',') + '||||||';
  const k = s => s.map(x => x.join(',')).join('||');
  const step = (st, o) => {
    const [aT, aB, bT, bB] = st.map(x => x.slice());
    const sw = s => { if (s.length < 2) return false; [s[0], s[1]] = [s[1], s[0]]; return true; };
    const fwd = (T, Bt, w) => { if (w) { if (!T.length) return false; Bt.push(T.shift()); return true; } if (T.length < 2) return false; T.push(T.shift()); return true; };
    const back = (T, Bt, w) => { if (w) { if (!Bt.length) return false; T.unshift(Bt.pop()); return true; } if (T.length < 2) return false; T.unshift(T.pop()); return true; };
    let ok;
    switch (o) {
      case 'sa': ok = sw(aT); break; case 'sb': ok = sw(bT); break; case 'ss': ok = sw(aT) && sw(bT); break;
      case 'pa': ok = bT.length > 0; if (ok) aT.unshift(bT.shift()); break;
      case 'pb': ok = aT.length > 0; if (ok) bT.unshift(aT.shift()); break;
      case 'ra': ok = fwd(aT, aB, wA); break; case 'rb': ok = fwd(bT, bB, wB); break; case 'rr': ok = fwd(aT, aB, wA) && fwd(bT, bB, wB); break;
      case 'rra': ok = back(aT, aB, wA); break; case 'rrb': ok = back(bT, bB, wB); break; case 'rrr': ok = back(aT, aB, wA) && back(bT, bB, wB); break;
    }
    return ok ? [aT, aB, bT, bB] : null;
  };
  const prev = new Map([[k(seg), null]]); let fr = [seg], found = k(seg) === goal ? k(seg) : null;
  while (fr.length && !found) {
    const nx = [];
    for (const st of fr) {
      for (const o of OPS) {
        const s2 = step(st, o); if (!s2) continue; const k2 = k(s2);
        if (prev.has(k2)) continue; prev.set(k2, [k(st), o]); nx.push(s2);
        if (k2 === goal) { found = k2; break; }
      }
      if (found) break;
    }
    fr = nx;
  }
  const ops = []; for (let s = found; prev.get(s); s = prev.get(s)[0]) ops.push(prev.get(s)[1]);
  ops.reverse(); leafCache.set(key, ops);
  return ops;
}
// Compress values to ranks 0..k-1, so leaf caches are shared between leaves.
export const compress = vals => { const s = vals.slice().sort((a, b) => a - b); return vals.map(v => s.indexOf(v)); };

// Sort all of A (≤ the leaf size) optimally, with B as a wall that keeps its order.
export function bfsSortA(m) {
  if (m.a.length < 2) return;
  for (const o of bfsLeaf(TA, false, m.b.length > 0, compress(m.a))) m.op(o);
}
