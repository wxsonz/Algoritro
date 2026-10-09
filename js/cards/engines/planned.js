// The planned quicksort of the study's claude-opus-5.5-max build, ported op for op from its C
// (quick.c, dp*.c, lst*.c, tbl_*.c, leaf.c, beam*.c, bucket*.c, ins_*.c, lis.c): DP Splits,
// Beam Leaf and Bucket Beam. A chunk of consecutive ranks sits at one of four ends; it is split by
// exact rank into up to three parts sent to the other ends, with sizes and destinations from a
// dynamic program over expected costs, until the plan calls it a leaf: solved by exact distance
// tables (up to 4 values, or 5 with BFS Leaf), by a beam search (up to 32, Beam Leaf), or, for
// Bucket Beam, by insertion around a longest increasing run in an order a beam finds cheapest.
// tests/planned.test.mjs holds it to that build's own streams.

const OPS = ['sa', 'sb', 'ss', 'pa', 'pb', 'ra', 'rb', 'rr', 'rra', 'rrb', 'rrr'];
const SA = 0, SB = 1, SS = 2, PA = 3, PB = 4, RA = 5, RB = 6, RR = 7, RRA = 8, RRB = 9, RRR = 10, NOPS = 11;
const TA = 0, BA = 1, TB = 2, BB = 3;
const INV = [SA, SB, SS, PB, PA, RRA, RRB, RRR, RA, RB, RR];
const TBL_MAX = 4, LEAF_MAX = 32, BEAM_W = 1000, BEAM_WORK = 150000, BEAM_WMIN = 200, BEAM_DEPTH = 200;
const SEEN_BITS = 19, DP_FULL = 32, DP_MAX = 2000, INS_TAB = 30, INS_W = 2000, INS_WORK = 1800000;
const BIG = 1e18;

// ---- emitting: the effective form of each operation, as the build's emit() records it ---------
// A double operation with one idle half is that half; an operation that changes nothing is dropped.
const A_SIDE = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1], B_SIDE = [0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1], DOUBLE = [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1];
function emitter(m) {
  return op => {
    let e;
    if (op === PA) e = m.b.length ? PA : -1;
    else if (op === PB) e = m.a.length ? PB : -1;
    else {
      const da = A_SIDE[op] && m.a.length >= 2, db = B_SIDE[op] && m.b.length >= 2;
      e = da && db ? op : da ? op - 2 * DOUBLE[op] : db ? op - DOUBLE[op] : -1;
    }
    if (e >= 0) m.op(OPS[e]);
  };
}

// ---- the chunk model (lst.c) -------------------------------------------------------------------
// A chunk's values, relabelled 0..m-1, in four parts: n[0] at the top of a, n[1] at its bottom,
// n[2] at the top of b, n[3] at its bottom. Everything else on a stack is a wall the model never
// disturbs. Each stack is packed in circular order from just below its wall:
// t = [bottom of a (wall to bottom), top of a (top to wall), bottom of b, top of b], so a rotation
// only moves the boundary between a stack's two parts. A state is 36 bytes: t[0..31], then n[0..3].
const SZ = 36, N0 = 32;
const newLst = () => new Uint8Array(SZ);
function rotSeg(s, from, len, right) {
  if (len < 2) return;
  if (right) { const c = s[from + len - 1]; for (let i = len - 1; i > 0; i--) s[from + i] = s[from + i - 1]; s[from] = c; return; }
  const c = s[from]; for (let i = 0; i < len - 1; i++) s[from + i] = s[from + i + 1]; s[from + len - 1] = c;
}
function lstOff(s, part) {
  if (part === BA) return 0;
  if (part === TA) return s[N0 + 1];
  if (part === BB) return s[N0] + s[N0 + 1];
  return s[N0] + s[N0 + 1] + s[N0 + 3];
}
function lstLegal(s, op) {
  const n0 = s[N0], n1 = s[N0 + 1], n2 = s[N0 + 2], n3 = s[N0 + 3];
  if (op === SA) return n0 >= 2;
  if (op === SB) return n2 >= 2;
  if (op === SS) return n0 >= 2 && n2 >= 2;
  if (op === PA || op === RB) return n2 >= 1;
  if (op === PB || op === RA) return n0 >= 1;
  if (op === RR) return n0 >= 1 && n2 >= 1;
  if (op === RRA) return n1 >= 1;
  if (op === RRB) return n3 >= 1;
  return n1 >= 1 && n3 >= 1;
}
function half(s, op) {
  const k = (op === SB || op === RB || op === RRB) ? 2 : 0;
  if (op === SA || op === SB) rotSeg(s, lstOff(s, k), 2, 0);
  else if (op === RA || op === RB) { s[N0 + k]--; s[N0 + k + 1]++; }
  else if (op === RRA || op === RRB) { s[N0 + k]++; s[N0 + k + 1]--; }
}
function lstApply(s, op) {
  if (!lstLegal(s, op)) return false;
  const tb = lstOff(s, TB);
  if (op === PA) { rotSeg(s, s[N0 + 1], tb - s[N0 + 1] + 1, 1); s[N0]++; s[N0 + 2]--; }
  else if (op === PB) { rotSeg(s, s[N0 + 1], tb - s[N0 + 1], 0); s[N0]--; s[N0 + 2]++; }
  else if (op === SS || op === RR || op === RRR) { half(s, op - 2); half(s, op - 1); }
  else half(s, op);
  return true;
}
// How many of the largest ranks already sit, in order, at the bottom of the top-of-a part.
function lstDelivered(s, m) {
  let k = 0, pos = s[N0 + 1] + s[N0] - 1;
  while (pos >= s[N0 + 1] && s[pos] === m - 1 - k) { k++; pos--; }
  return k;
}
// Copy the chunk [lo, lo + m) from the real stacks: per stack, the bottom run (from the wall down)
// then the top run (from the top down). A stack holding nothing but chunk values goes entirely
// into the top part. Fails if the chunk is not at the stacks' ends.
function fillSide(st, lo, m, o, at, part) {
  const L = st.length, inC = x => x - lo >= 0 && x - lo < m;
  let top = 0; while (top < L && inC(st[top])) top++;
  let bot = 0; while (top < L && bot < L - top && inC(st[L - 1 - bot])) bot++;
  for (let i = L - bot; i < L; i++) o[at++] = st[i] - lo;
  for (let i = 0; i < top; i++) o[at++] = st[i] - lo;
  o[N0 + part] = top; o[N0 + part + 1] = bot;
  return at;
}
function lstExtract(mach, lo, m, out) {
  if (m > LEAF_MAX) return false;
  const k = fillSide(mach.a, lo, m, out, 0, 0);
  if (k > m) return false;
  return fillSide(mach.b, lo, m, out, k, 2) === m;
}
// Projection onto values [lo, hi): the others deleted, which only makes the problem easier.
const P_ORDER = [BA, TA, BB, TB];
function lstProject(s, lo, hi, p) {
  let k = 0, i = 0;
  for (let part = 0; part < 4; part++) {
    const o = P_ORDER[part]; p[N0 + o] = 0;
    const end = i + s[N0 + o];
    for (; i < end; i++) if (s[i] >= lo && s[i] < hi) { p[k++] = s[i] - lo; p[N0 + o]++; }
  }
}

// ---- exact distance tables (tbl_*.c) -----------------------------------------------------------
// For chunks of 1..max values (4, or 5 with BFS Leaf): the distance to "sorted on top of a" of every
// state, by one backward BFS each. Indexed by the permutation rank of the packed values times the
// number of part-length compositions, plus the composition's rank.
const POPC = Uint8Array.from({ length: 64 }, (_, x) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; });
function makeTables(max) {
  const T = { max, fact: [1], ncomp: [], cidx: [], d: [], avg: [] };
  for (let m = 1; m <= max; m++) T.fact[m] = T.fact[m - 1] * m;
  for (let m = 0; m <= max; m++) {
    const ci = new Int16Array(512).fill(-1); let c = 0;
    for (let n0 = 0; n0 <= m; n0++) for (let n1 = 0; n1 <= m - n0; n1++) for (let n2 = 0; n2 <= m - n0 - n1; n2++) ci[(n0 * 8 + n1) * 8 + n2] = c++;
    T.cidx[m] = ci; T.ncomp[m] = c;
  }
  for (let m = 1; m <= max; m++) bfsTable(T, m);
  for (let m = 1; m <= max; m++) averages(T, m);
  return T;
}
function tblRank(s, m) {
  let code = 0, used = 0;
  for (let i = 0; i < m; i++) { const x = s[i]; code = code * (m - i) + x - POPC[used & ((1 << x) - 1)]; used |= 1 << x; }
  return code;
}
const tblIndex = (T, s, m) => tblRank(s, m) * T.ncomp[m] + T.cidx[m][(s[N0] * 8 + s[N0 + 1]) * 8 + s[N0 + 2]];
function tblUnrank(r, m, out) {
  const digit = [];
  for (let i = m - 1; i >= 0; i--) { digit[i] = r % (m - i); r = Math.floor(r / (m - i)); }
  let used = 0;
  for (let i = 0; i < m; i++) {
    let k = -1;
    while (digit[i] >= 0) { k++; if (!(used & (1 << k))) digit[i]--; }
    out[i] = k; used |= 1 << k;
  }
}
function bfsTable(T, m) {
  const size = T.fact[m] * T.ncomp[m], d = new Uint8Array(size).fill(255), q = [];
  const s = newLst(); for (let i = 0; i < m; i++) s[i] = i; s[N0] = m;
  d[tblIndex(T, s, m)] = 0; q.push(s);
  let head = 0, lvlEnd = 1, level = 0;
  while (head < q.length) {
    if (head === lvlEnd) { level++; lvlEnd = q.length; }
    const cur = q[head++];
    for (let op = 0; op < NOPS; op++) {
      const u = new Uint8Array(cur);
      if (!lstApply(u, op)) continue;
      const k = tblIndex(T, u, m);
      if (d[k] !== 255) continue;
      d[k] = level + 1; q.push(u);
    }
  }
  T.d[m] = d;
}
// Expected optimal cost of m random values at each end: the planner's leaf costs up to max.
function averages(T, m) {
  const p = new Uint8Array(m), s = newLst(); T.avg[m] = [0, 0, 0, 0];
  for (let r = 0; r < T.fact[m]; r++) {
    tblUnrank(r, m, p);
    for (let loc = 0; loc < 4; loc++) {
      s.fill(0); s[N0 + loc] = m; for (let i = 0; i < m; i++) s[i] = p[i];
      T.avg[m][loc] += T.d[m][tblIndex(T, s, m)];
    }
  }
  for (let loc = 0; loc < 4; loc++) T.avg[m][loc] /= T.fact[m];
}
const tblDist = (T, s, m) => m === 0 ? 0 : T.d[m][tblIndex(T, s, m)];
const PROJ = newLst();
function tblProj(T, s, lo, hi) { lstProject(s, lo, hi, PROJ); return tblDist(T, PROJ, hi - lo); }
// Follow strictly decreasing distances to the goal, emitting each step: an optimal solution.
function tblDescend(E, T, s, m) {
  let d = tblDist(T, s, m);
  const u = newLst();
  while (d > 0 && d !== 255) {
    let op = 0;
    for (; op < NOPS; op++) { u.set(s); if (lstApply(u, op) && tblDist(T, u, m) === d - 1) break; }
    if (op === NOPS) return false;
    E(op); s.set(u); d--;
  }
  return d === 0;
}
let TABLES = {};
const tables = max => (TABLES[max] ??= makeTables(max));

// ---- the leaf beam (beam*.c): chunks of 5 to 32 values ----------------------------------------
// A level-synchronous beam: every frontier node has the same depth, so they are ranked by the
// heuristic alone (exact table distances of the chunk's projections onto groups of 4 consecutive
// ranks, plus penalties for values that block higher ones), and the w best survive. A successor
// with at most 4 undelivered values is finished exactly from the table. States seen in this search
// are skipped (a hash table never cleared: each slot carries the search's generation).
const REC = SZ + 16, CAND = BEAM_W * NOPS;
const views = (buf, n, a, b) => Array.from({ length: n }, (_, i) => buf.subarray(i * REC + a, i * REC + b));
const BM = (() => {
  const curB = new Uint8Array(BEAM_W * REC), candB = new Uint8Array(CAND * REC);
  return {
    cur: views(curB, BEAM_W, 0, REC), curS: views(curB, BEAM_W, 0, SZ), curG: views(curB, BEAM_W, SZ, REC),
    cand: views(candB, CAND, 0, REC), candS: views(candB, CAND, 0, SZ), candG: views(candB, CAND, SZ, REC),
    curH: new Int32Array(BEAM_W), curPar: new Int32Array(BEAM_W), curOp: new Int32Array(BEAM_W), curD: new Int32Array(BEAM_W),
    cH: new Int32Array(CAND), cPar: new Int32Array(CAND), cOp: new Int32Array(CAND), cD: new Int32Array(CAND), ord: new Int32Array(CAND),
    lpar: new Int32Array(BEAM_W * (BEAM_DEPTH + 1)), lop: new Uint8Array(BEAM_W * (BEAM_DEPTH + 1)),
    keyHi: new Uint32Array(1 << SEEN_BITS), keyLo: new Uint32Array(1 << SEEN_BITS),
    gen: 0, w: BEAM_WMIN, m: 0, ncur: 0, ncand: 0, best: 0, blvl: -1, bpar: 0, bop: 0, bs: newLst(), T: null,
  };
})();
// 64-bit FNV-1a in two 32-bit halves: h = (h ^ x) * 0x100000001b3, modulo 2^64.
let HI = 0, LO = 0;
function fnv(x) {
  const lo = (LO ^ x) >>> 0, p = lo * 435;
  LO = p >>> 0;
  HI = (HI * 435 + Math.floor(p / 4294967296) + ((lo << 8) >>> 0)) >>> 0;
}
function lstHash(s, m) {
  HI = 0x14650fb0; LO = 0x739d0383;   // 1469598103934665603: the build's constant, one digit short of FNV's
  for (let i = 0; i < m; i++) fnv(s[i]);
  for (let i = 0; i < 4; i++) fnv(0x100 + s[N0 + i]);
}
const SEEN_MASK = (1 << SEEN_BITS) - 1;
function beamSeen(s) {
  lstHash(s, BM.m);
  const g = BM.gen & 0xffff, hi = HI, lo = ((LO & 0xffff0000) | g) >>> 0;
  let slot = ((lo >>> 16) | ((hi & 7) << 16)) & SEEN_MASK;
  for (let probe = 0; probe < 64; probe++) {
    if ((BM.keyLo[slot] & 0xffff) !== g) { BM.keyHi[slot] = hi; BM.keyLo[slot] = lo; return false; }
    if (BM.keyHi[slot] === hi && BM.keyLo[slot] === lo) return true;
    slot = (slot + 1) & SEEN_MASK;
  }
  return false;
}
// Penalties at every group boundary at once (group of a value: v / 4).
function penTop(s, d, groups) {
  let pen = 0, low = groups;
  for (let i = s[N0 + 1] + s[N0] - d - 1; i >= s[N0 + 1]; i--) {
    const g = (s[i] / TBL_MAX) | 0;
    pen += groups - 1 - g;
    if (g > low) pen += g - low;
    if (g < low) low = g;
  }
  return pen;
}
function penEnd(s, far, near) {
  const step = near < far ? -1 : 1;
  let high = 0, pen = 0, i = far - step;
  while (i !== near) {
    i += step;
    const g = (s[i] / TBL_MAX) | 0;
    if (g < high) pen += high - g; else high = g;
  }
  return pen;
}
function penalties(s, d, groups) {
  const bb = lstOff(s, BB), tb = lstOff(s, TB);
  let pen = 0;
  if (s[N0 + 1]) pen += penEnd(s, 0, s[N0 + 1] - 1);
  if (s[N0 + 3]) pen += penEnd(s, bb, bb + s[N0 + 3] - 1);
  if (s[N0 + 2]) pen += penEnd(s, tb + s[N0 + 2] - 1, tb);
  return penTop(s, d, groups) + pen;
}
// The estimate for a node (s, its group distances gd, d delivered): only groups in mask are
// recomputed, or all when mask < 0.
function beamHeur(T, s, gd, d, m, mask) {
  const u = m - d;
  let h = 0, lo = 0, g = 0;
  while (lo < u) {
    const hi = Math.min(lo + TBL_MAX, u);
    if (mask < 0 || (mask >> g) & 1) gd[g] = tblProj(T, s, lo, hi);
    h += gd[g]; lo = hi; g++;
  }
  return h + penalties(s, d, g);
}
const bit = x => 1 << ((x / TBL_MAX) | 0);
const swapBits = (s, at) => ((s[at] / TBL_MAX) | 0) === ((s[at + 1] / TBL_MAX) | 0) ? bit(s[at]) : 0;
// Groups whose projection op can change, read from the state before it.
function beamMoved(s, op) {
  let mask = 0;
  const ta = s[N0 + 1], tb = lstOff(s, TB);
  if (op === SA || op === SS) mask |= swapBits(s, ta);
  if (op === SB || op === SS) mask |= swapBits(s, tb);
  if (op === PB || op === RA || op === RR) mask |= bit(s[ta]);
  if (op === PA || op === RB || op === RR) mask |= bit(s[tb]);
  if (op === RRA || op === RRR) mask |= bit(s[ta - 1]);
  if (op === RRB || op === RRR) mask |= bit(s[tb - 1]);
  return mask;
}
function beamLevel(level) {
  const T = BM.T, m = BM.m;
  BM.ncand = 0;
  for (let i = 0; i < BM.ncur; i++) for (let op = 0; op < NOPS; op++) {
    if (BM.curOp[i] >= 0 && INV[BM.curOp[i]] === op) continue;   // never undo the last move
    const k = BM.ncand, cs = BM.candS[k];
    BM.cand[k].set(BM.cur[i]); BM.cH[k] = BM.curH[i]; BM.cPar[k] = BM.curPar[i]; BM.cOp[k] = BM.curOp[i]; BM.cD[k] = BM.curD[i];
    if (!lstApply(cs, op) || beamSeen(cs)) continue;
    BM.cOp[k] = op;
    // consider(): never undo a delivered value; finish exactly when it can be.
    const d = lstDelivered(cs, m);
    BM.cD[k] = d;
    if (d < BM.curD[i]) continue;
    if (m - d <= TBL_MAX) {
      const total = level + 1 + tblProj(T, cs, 0, m - d);
      if (total < BM.best) { BM.best = total; BM.bs.set(cs); BM.blvl = level + 1; BM.bpar = i; BM.bop = op; }
      continue;
    }
    const mask = d !== BM.curD[i] ? -1 : beamMoved(BM.curS[i], op);
    BM.cH[k] = beamHeur(T, cs, BM.candG[k], d, m, mask);
    BM.cPar[k] = i;
    BM.ncand++;
  }
}
// Quickselect on h, on an index permutation (the same swaps as the C does on the nodes).
function beamSelect(n, k) {
  const o = BM.ord, h = BM.cH;
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    let t = o[mid]; o[mid] = o[hi]; o[hi] = t;
    const pivot = h[o[hi]];
    let i = lo;
    for (let j = lo; j < hi; j++) if (h[o[j]] < pivot) { t = o[i]; o[i] = o[j]; o[j] = t; i++; }
    t = o[i]; o[i] = o[hi]; o[hi] = t;
    if (i === k) return;
    if (i < k) lo = i + 1; else hi = i - 1;
  }
}
function keepBest(level) {
  let k = BM.ncand;
  for (let j = 0; j < k; j++) BM.ord[j] = j;
  if (k > BM.w) { beamSelect(BM.ncand, BM.w); k = BM.w; }
  for (let j = 0; j < k; j++) {
    const c = BM.ord[j];
    BM.cur[j].set(BM.cand[c]); BM.curH[j] = BM.cH[c]; BM.curPar[j] = BM.cPar[c]; BM.curOp[j] = BM.cOp[c]; BM.curD[j] = BM.cD[c];
    BM.lpar[level * BM.w + j] = BM.cPar[c]; BM.lop[level * BM.w + j] = BM.cOp[c];
  }
  BM.ncur = k;
}
function beamSearch(start) {
  const T = BM.T, m = BM.m;
  BM.gen = (BM.gen + 1) & 0xffff; if (BM.gen === 0) BM.gen = 1;
  BM.best = BEAM_DEPTH + 64; BM.blvl = -1;
  BM.curS[0].set(start); BM.curOp[0] = -1; BM.curD[0] = lstDelivered(start, m);
  BM.curH[0] = beamHeur(T, BM.curS[0], BM.curG[0], BM.curD[0], m, -1); BM.curPar[0] = 0;
  BM.ncur = 1;
  beamSeen(start);
  if (m - BM.curD[0] <= TBL_MAX) { BM.best = tblProj(T, start, 0, m - BM.curD[0]); BM.bs.set(start); BM.blvl = 0; return true; }
  for (let level = 0; BM.ncur > 0 && level < BEAM_DEPTH && level + 1 < BM.best;) { beamLevel(level); level++; keepBest(level); }
  return BM.blvl >= 0;
}
function emitPath(E) {
  const path = []; path[BM.blvl - 1] = BM.bop;
  let p = BM.bpar;
  for (let lv = BM.blvl - 1; lv >= 1; lv--) { path[lv - 1] = BM.lop[lv * BM.w + p]; p = BM.lpar[lv * BM.w + p]; }
  for (let lv = 0; lv < BM.blvl; lv++) E(path[lv]);
}
// Solve chunk [lo, lo + m) by beam search unless its best solution is longer than limit (the
// expected cost of splitting it instead); nothing is emitted when it returns false.
function beamSolve(E, mach, lo, m, limit) {
  const s = newLst();
  if (!lstExtract(mach, lo, m, s)) return false;
  BM.m = m; BM.T = tables(TBL_MAX);
  if (!beamSearch(s) || BM.best > limit) return false;
  if (BM.blvl > 0) emitPath(E);
  // The table finish works on the projection onto the undelivered values.
  const u = m - lstDelivered(BM.bs, m), p = newLst();
  lstProject(BM.bs, 0, u, p);
  return tblDescend(E, BM.T, p, u);
}

// ---- the split planner (dp*.c) -----------------------------------------------------------------
// For every size m and context (the chunk's end; does a, does b hold anything else?), the cheaper
// of its leaf cost and its best split into up to three parts sent to the other ends, the part with
// the largest ranks first. A split costs each value's move plus each part's own expected cost, less
// the expected rr merges. Sizes come from an exhaustive scan up to 32, else from hill climbing that
// starts at the previous size's optimum, re-anchored by a coarse grid every 16 sizes.
const dpId = (m, loc, fa, fb) => ((m * 4 + loc) * 2 + fa) * 2 + fb;
const dpNorm = (loc, fa, fb) => loc === BA && !fa ? TA : loc === BB && !fb ? TB : loc;
const isA = l => l === TA || l === BA;
function moveCost(from, to) {
  const toA = isA(to);
  return (from === BA || from === BB ? 1 : 0) + (isA(from) && !toA ? 1 : 0) + (!isA(from) && toA ? 1 : 0) + (to === BA || to === BB ? 1 : 0);
}
// A plan: [sz0, sz1, sz2, dst0, dst1, dst2, leaf], 7 shorts.
const PL = 7;
function newDp(N, k, forced, leafc) {
  const cells = (N + 1) * 16;
  const dp = { n: 0, k, forced, leafc, e: new Float64Array(cells), es: new Float64Array(cells), p: new Int16Array(cells * PL), ps: new Int16Array(cells * PL), hint: new Int32Array(16 * 6 * 2).fill(0) };
  for (let i = 0; i < 16 * 6; i++) dp.hint[i * 2] = -1;
  return dp;
}
function valid(ctx, pl, m) {
  let used = 0;
  const limit = m > LEAF_MAX ? Math.trunc((3 * m) / 4) : m;
  for (let k = 0; k < 3; k++) {
    if (pl[k] < 0 || pl[k] > limit) return false;
    if (pl[k] > 0) used++;
    if (pl[k] > 0 && (pl[3 + k] === ctx[0] || (pl[3 + k] === TA && k > 0))) return false;
  }
  return used >= 2 && pl[0] + pl[1] + pl[2] === m;
}
function dpCost(dp, ctx, pl, m) {
  if (!valid(ctx, pl, m)) return BIG;
  let c = 0, sba = 0, sbb = 0;
  for (let k = 0; k < 3; k++) {
    if (pl[k] === 0) continue;
    // The part's context when it is processed: a holds something else if it did before, if an
    // earlier part was sorted into it, or if a later part waits in it; b likewise.
    let fa = ctx[1], fb = ctx[2];
    for (let j = 0; j < 3; j++) {
      if (pl[j] === 0 || j === k) continue;
      if (j < k) fa = 1; else if (isA(pl[3 + j])) fa = 1; else fb = 1;
    }
    c += pl[k] * moveCost(ctx[0], pl[3 + k]) + dp.e[dpId(pl[k], pl[3 + k], fa, fb)];
    if (pl[3 + k] === BA) sba += pl[k];
    if (pl[3 + k] === BB) sbb += pl[k];
  }
  if (ctx[0] === TA || ctx[0] === TB) c -= sba * sbb / m;
  return c;
}
function dpEval(q, s0, s1) {
  q.cur[0] = s0; q.cur[1] = s1; q.cur[2] = q.m - s0 - s1;
  const c = dpCost(q.dp, q.ctx, q.cur, q.m);
  if (c < q.lc) { q.lc = c; q.b0 = s0; q.b1 = s1; }
  if (c < q.bc) { q.bc = c; q.best.set(q.cur); }
  return c;
}
function dpClimb(q, st) {
  while (st >= 1) {
    const c0 = q.b0, c1 = q.b1;
    for (let d0 = -1; d0 <= 1; d0++) for (let d1 = -1; d1 <= 1; d1++)
      if ((d0 || d1) && c0 + d0 * st >= 0 && c1 + d1 * st >= 0) dpEval(q, c0 + d0 * st, c1 + d1 * st);
    if (q.b0 === c0 && q.b1 === c1) st = Math.trunc(st / 2);
  }
}
function sizesFor(q, ci) {
  const h = q.dp.hint, at = (ci * 6 + q.o) * 2;
  if (q.m <= DP_FULL) { for (let s0 = 0; s0 <= q.m; s0++) for (let s1 = 0; s1 <= q.m - s0; s1++) dpEval(q, s0, s1); }
  else if (q.m % 16 === 0 || h[at] < 0) {
    const st = Math.trunc(q.m / 12);
    for (let s0 = 0; s0 <= q.m; s0 += st) { for (let s1 = 0; s1 <= q.m - s0; s1 += st) dpEval(q, s0, s1); dpEval(q, s0, q.m - s0); }
    if (q.lc < 1e17) dpClimb(q, Math.trunc(st / 2));
  } else {
    dpEval(q, h[at] + (h[at] * 2 > q.m ? 1 : 0), h[at + 1] + (h[at + 1] * 2 > q.m ? 1 : 0));
    dpEval(q, h[at], h[at + 1]);
    if (q.lc < 1e17) dpClimb(q, 4);
  }
  h[at] = -1;
  if (q.lc < 1e17) { h[at] = q.b0; h[at + 1] = q.b1; }
}
const ORDER = '012021102120201210';
function dpSearch(dp, ctx, m, out) {
  const q = { dp, ctx, m, cur: new Int16Array(PL), best: new Int16Array(PL), bc: BIG, lc: BIG, b0: 0, b1: 0, o: 0 };
  for (q.o = 0; q.o < 6; q.o++) {
    for (let k = 0; k < 3; k++) { const x = +ORDER[3 * q.o + k]; q.cur[3 + k] = x + (x >= ctx[0] ? 1 : 0); }
    q.lc = BIG;
    sizesFor(q, ctx[0] * 4 + ctx[1] * 2 + ctx[2]);
  }
  out.set(q.best);
  return q.bc;
}
function dpSettle(dp, ctx, m, split) {
  const id = dpId(m, ctx[0], ctx[1], ctx[2]), nid = dpId(m, dpNorm(ctx[0], ctx[1], ctx[2]), ctx[1], ctx[2]);
  if (nid !== id) {
    dp.e[id] = dp.e[nid]; dp.es[id] = dp.es[nid];
    dp.p.copyWithin(id * PL, nid * PL, nid * PL + PL); dp.ps.copyWithin(id * PL, nid * PL, nid * PL + PL);
    return;
  }
  const leaf = m <= dp.k ? dp.leafc[m * 4 + ctx[0]] : BIG;
  dp.p.set(dp.ps.subarray(id * PL, id * PL + PL), id * PL);
  dp.e[id] = split; dp.es[id] = split;
  if (leaf < 1e17 && (dp.forced || leaf <= split)) { dp.e[id] = leaf; dp.p[id * PL + 6] = 1; }
}
// Bottom-up over sizes, resuming where an earlier, smaller run stopped: a size's plan depends only
// on the smaller ones, so plans are cached per kind of leaf and grown on demand.
function dpRun(dp, N) {
  const ctx = [0, 0, 0], out = new Int16Array(PL);
  for (let m = dp.n + 1; m <= N; m++) {
    for (let i = 0; i < 16; i++) {
      ctx[0] = i >> 2; ctx[1] = (i >> 1) & 1; ctx[2] = i & 1;
      let split = BIG;
      if (dpNorm(ctx[0], ctx[1], ctx[2]) === ctx[0] && !(dp.forced && m <= dp.k)) {
        out.fill(0); split = dpSearch(dp, ctx, m, out);
        dp.ps.set(out, dpId(m, ctx[0], ctx[1], ctx[2]) * PL);
      }
      dpSettle(dp, ctx, m, split);
    }
    dp.n = m;
  }
}
function grow(dp, N) {
  if (N <= dp.n) return dp;
  const cells = (N + 1) * 16;
  if (dp.e.length < cells) {
    const g = (a, len) => { const b = new a.constructor(len); b.set(a); return b; };
    dp.e = g(dp.e, cells); dp.es = g(dp.es, cells); dp.p = g(dp.p, cells * PL); dp.ps = g(dp.ps, cells * PL);
  }
  dpRun(dp, N);
  return dp;
}
function scale(src, from, m) {
  const out = Int16Array.from(src); out[6] = 0;
  let sum = 0;
  for (let k = 0; k < 3; k++) { out[k] = Math.trunc((src[k] * m) / from); sum += out[k]; }
  for (let k = 0; sum < m; k++) if (src[k % 3] > 0) { out[k % 3]++; sum++; }
  return out;
}
const planOf = (arr, id) => arr.subarray(id * PL, id * PL + PL);
function planAt(dp, ctx, m) {
  if (m <= dp.n) return planOf(dp.p, dpId(m, ctx[0], ctx[1], ctx[2]));
  return scale(planOf(dp.ps, dpId(dp.n, ctx[0], ctx[1], ctx[2])), dp.n, m);
}
function splitAt(dp, ctx, m) {
  if (m <= dp.n) { const p = Int16Array.from(planOf(dp.ps, dpId(m, ctx[0], ctx[1], ctx[2]))); p[6] = 0; return p; }
  return scale(planOf(dp.ps, dpId(dp.n, ctx[0], ctx[1], ctx[2])), dp.n, m);
}
function splitCost(dp, ctx, m) {
  if (m > dp.n) return 1 << 30;
  const c = dp.es[dpId(m, ctx[0], ctx[1], ctx[2])];
  return c > 1e9 ? 1 << 30 : Math.trunc(c);
}
// Leaf costs, in tenths: the beam search (300 wide) on random chunks of 5..32 values at each end
// (top a, bottom a, top b, bottom b), and bucket insertion on buckets of 1..30, both measured by
// that build on 120 random chunks per cell (dp_leaf.c).
const BEAM_COST = [[91, 98, 84, 107], [113, 126, 103, 133], [140, 158, 126, 161], [164, 187, 146, 189], [185, 215, 169, 216],
  [215, 250, 193, 246], [240, 282, 217, 275], [268, 317, 241, 303], [298, 355, 271, 338], [323, 393, 295, 369], [352, 435, 328, 402],
  [388, 469, 359, 440], [418, 515, 389, 471], [448, 546, 424, 502], [486, 594, 451, 536], [520, 644, 488, 580], [554, 691, 534, 615],
  [583, 729, 572, 652], [618, 776, 592, 693], [665, 832, 632, 738], [706, 876, 688, 783], [738, 912, 720, 829], [777, 972, 760, 868],
  [816, 1024, 811, 918], [856, 1075, 871, 968], [901, 1138, 897, 1021], [944, 1178, 952, 1058], [994, 1239, 992, 1113]];
const INS_COST = [[0, 10, 10, 20], [19, 41, 28, 40], [50, 67, 47, 63], [76, 95, 67, 88], [102, 130, 90, 113],
  [129, 167, 109, 142], [158, 200, 133, 171], [185, 234, 157, 197], [214, 275, 181, 226], [246, 312, 209, 262], [277, 353, 233, 314],
  [312, 392, 262, 364], [343, 440, 293, 404], [370, 477, 327, 445], [410, 521, 363, 487], [444, 558, 396, 535], [492, 612, 448, 578],
  [527, 666, 473, 621], [578, 724, 527, 655], [608, 778, 560, 702], [664, 838, 627, 746], [710, 883, 665, 788], [777, 961, 701, 842],
  [810, 1011, 756, 886], [888, 1095, 804, 922], [948, 1152, 840, 997], [1015, 1227, 896, 1030], [1062, 1307, 924, 1077], [1122, 1371, 982, 1137],
  [1179, 1433, 1033, 1165]];
// Leaf kinds: 'beam' (exact up to 4, beam to 32), 5 (exact to 5: BFS Leaf), 4 (Distance Tables),
// 1 (no Finisher), or 'bucket' (forced leaves of b values, bucket insertion).
const DPS = new Map();
function planner(kind, N, b) {
  const key = kind === 'bucket' ? `bucket|${b}` : String(kind);
  let dp = DPS.get(key);
  if (!dp) {
    const k = kind === 'beam' ? LEAF_MAX : kind === 'bucket' ? b : kind, leafc = new Float64Array(4 * (k + 1));
    const T = kind === 'bucket' ? null : tables(kind === 5 ? 5 : TBL_MAX);
    for (let m = 1; m <= k; m++) for (let loc = 0; loc < 4; loc++) {
      if (kind === 'bucket') {
        if (m <= INS_TAB) { leafc[m * 4 + loc] = INS_COST[m - 1][loc] / 10.0; continue; }
        const pe = INS_COST[INS_TAB - 1][loc] / (10.0 * INS_TAB), slope = (pe - INS_COST[INS_TAB - 6][loc] / (10.0 * (INS_TAB - 5))) / 5.0;
        leafc[m * 4 + loc] = m * (pe + slope * (m - INS_TAB));
      } else leafc[m * 4 + loc] = m <= T.max ? T.avg[m][loc] : BEAM_COST[m - TBL_MAX - 1][loc] / 10.0;
    }
    dp = newDp(Math.min(N, DP_MAX), k, kind === 'bucket' ? 1 : 0, leafc);
    DPS.set(key, dp);
  }
  return grow(dp, Math.min(N, DP_MAX));
}

// ---- the executor (quick.c) --------------------------------------------------------------------
const locPeek = (mach, loc) => loc === TA ? mach.a[0] : loc === BA ? mach.a[mach.a.length - 1] : loc === TB ? mach.b[0] : mach.b[mach.b.length - 1];
// Move the value at end `from` to end `to`: at most three operations, passing over nothing.
function locMove(E, from, to) {
  const toA = isA(to);
  if (from === BA) E(RRA);
  if (from === BB) E(RRB);
  if (isA(from) && !toA) E(PB);
  if (!isA(from) && toA) E(PA);
  if (to === BA) E(RA);
  if (to === BB) E(RB);
}
function chunkCtx(mach, loc, size) {
  const inA = isA(loc) ? 1 : 0, fa = mach.a.length > size * inA ? 1 : 0, fb = mach.b.length > size * (1 - inA) ? 1 : 0;
  return [dpNorm(loc, fa, fb), fa, fb];
}
const LOC_NAME = ['top of A', 'bottom of A', 'top of B', 'bottom of B'];
// Exact ranks: part k receives ranks [bound[k + 1], bound[k]), part 0 the largest; the parts are
// then sorted in that order, each landing on top of a directly above the previous one.
function split(X, loc, lo, pl) {
  const { mach, E } = X, bound = [lo + pl[0] + pl[1] + pl[2]];
  for (let k = 0; k < 3; k++) bound[k + 1] = bound[k] - pl[k];
  mach.phase(`split ${bound[0] - lo} at the ${LOC_NAME[loc]}`).why(`exact ranks into ${[0, 1, 2].filter(k => pl[k]).map(k => `${pl[k]} to the ${LOC_NAME[pl[3 + k]]}`).join(', ')}`)
    .overlay('partition', { loc, lo, hi: bound[0], cuts: [bound[2], bound[1]] });
  for (let i = bound[0] - lo; i > 0; i--) {
    const x = locPeek(mach, loc);
    let k = 0;
    while (k < 2 && x < bound[k + 1]) k++;
    locMove(E, loc, pl[3 + k]);
  }
  for (let k = 0; k < 3; k++) qsChunk(X, pl[3 + k], bound[k + 1], pl[k]);
}
// Sort the chunk of ranks [lo, lo + size) at `loc` onto the top of a, directly above everything
// already sorted: by its plan's split, or as a leaf. A failed leaf falls back to the best split.
function qsChunk(X, loc, lo, size) {
  if (size <= 0) return;
  const { mach, E, dp } = X, ctx = chunkCtx(mach, loc, size);
  let pl = planAt(dp, ctx, size);
  if (pl[6]) {
    mach.phase(`leaf of ${size}`).overlay('partition', { loc: ctx[0], lo, hi: lo + size });
    let done;
    if (X.kind === 'bucket') { mach.why('bucket: keep a longest increasing run, insert the rest in the order a beam finds cheapest'); done = bucketSolve(X, lo, size); }
    else if (size <= (X.kind === 5 ? 5 : TBL_MAX)) { mach.why('exact: follow the distance table'); done = leafExact(X, lo, size); }
    else { mach.why(`beam search over ${size} values (width ${BM.w})`); done = beamSolve(E, mach, lo, size, splitCost(dp, ctx, size)); }
    if (done) return;
    pl = splitAt(dp, ctx, size);
  }
  split(X, ctx[0], lo, pl);
}
function leafExact(X, lo, m) {
  if (m <= 0) return true;
  const s = newLst();
  if (!lstExtract(X.mach, lo, m, s)) return false;
  return tblDescend(X.E, tables(X.kind === 5 ? 5 : TBL_MAX), s, m);
}

// ---- bucket insertion (bucket*.c, ins_*.c, lis.c): Bucket Beam's leaves ------------------------
// A bucket's values as two lists with cursors: each stack's bottom run then its top run, the
// cursor between them. Walled: a cursor cannot wrap.
function runsOf(st, lo, m) {
  const L = st.length, inB = x => x - lo >= 0 && x - lo < m;
  let t0 = 0; while (t0 < L && inB(st[t0])) t0++;
  let t1 = 0; while (t0 < L && t1 < L - t0 && inB(st[L - 1 - t1])) t1++;
  if (t0 < L || L === 0) return [t0, t1];
  // A stack holding only bucket values has no wall: start its list at its smallest value.
  t0 = 0; for (let i = 1; i < L; i++) if (st[i] < st[t0]) t0 = i;
  return [t0, L - t0];
}
function sideOf(st, [t0, t1], list) {
  const L = st.length; let k = 0;
  for (let i = L - t1; i < L; i++) list[k++] = st[i];
  const cursor = k;
  for (let i = 0; i < t0; i++) list[k++] = st[i];
  return [k, cursor];
}
const newCl = cap => ({ la: new Int32Array(cap + 1), lb: new Int32Array(cap + 1), na: 0, nb: 0, ca: 0, cb: 0, g: 0 });
function bucketExtract(mach, lo, m, c) {
  [c.na, c.ca] = sideOf(mach.a, runsOf(mach.a, lo, m), c.la);
  [c.nb, c.cb] = sideOf(mach.b, runsOf(mach.b, lo, m), c.lb);
  c.g = 0;
  return c.na + c.nb === m;
}
function lisMark(v, n) {
  const tail = new Int32Array(n + 1), prev = new Int32Array(n + 1), keep = new Uint8Array(n);
  let len = 0;
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = len;
    while (lo < hi) { const mid = lo + ((hi - lo) >> 1); if (v[tail[mid]] < v[i]) lo = mid + 1; else hi = mid; }
    prev[i] = lo > 0 ? tail[lo - 1] : -1; tail[lo] = i; if (lo === len) len++;
  }
  for (let i = len > 0 ? tail[len - 1] : -1; i >= 0; i = prev[i]) keep[i] = 1;
  return keep;
}
function emitRot(E, da, db) {
  for (; da > 0 && db > 0; da--, db--) E(RR);
  for (; da < 0 && db < 0; da++, db++) E(RRR);
  for (let k = da; k > 0; k--) E(RA);
  for (let k = -da; k > 0; k--) E(RRA);
  for (let k = db; k > 0; k--) E(RB);
  for (let k = -db; k > 0; k--) E(RRB);
}
// Keep a longest increasing run of the bucket's values in a and push the rest to b, scanning from
// the end the cursor is nearest to.
function bucketLis(E, c) {
  const keep = lisMark(c.la, c.na);
  let i = 0; while (i < c.na && keep[i]) i++;
  if (i >= c.na) return;
  if (c.ca === c.na) {
    let edge = 0; while (edge < c.na && keep[edge]) edge++;
    for (let j = c.na - 1; j >= edge; j--) { E(RRA); if (!keep[j]) E(PB); }
    return;
  }
  emitRot(E, -c.ca, 0);
  let edge = c.na - 1; while (edge >= 0 && keep[edge]) edge--;
  for (let j = 0; j <= edge; j++) E(keep[j] ? RA : PB);
}
function insSlot(c, x) {
  let lo = 0, hi = c.na;
  while (lo < hi) { const mid = lo + ((hi - lo) >> 1); if (c.la[mid] > x) hi = mid; else lo = mid + 1; }
  return lo;
}
// Operations to insert lb[j]: each cursor its single way (walled), sharing rr / rrr, then pa.
let DA = 0, DB = 0;
function insCost(c, j) {
  const p = insSlot(c, c.lb[j]);
  DA = p - c.ca; DB = j - c.cb;
  if ((DA >= 0) === (DB >= 0)) return Math.max(Math.abs(DA), Math.abs(DB)) + 1;
  return Math.abs(DA) + Math.abs(DB) + 1;
}
function insApply(c, j) {
  const x = c.lb[j], p = insSlot(c, x);
  for (let i = j; i < c.nb - 1; i++) c.lb[i] = c.lb[i + 1];
  c.nb--; c.cb = j;
  for (let i = c.na; i > p; i--) c.la[i] = c.la[i - 1];
  c.la[p] = x; c.na++; c.ca = p;
}
function insCopy(d, s) { d.la.set(s.la.subarray(0, s.na)); d.lb.set(s.lb.subarray(0, s.nb)); d.na = s.na; d.nb = s.nb; d.ca = s.ca; d.cb = s.cb; d.g = s.g; }
// Beam over insertion orders: every step inserts one value of b into a's sorted list; the beam
// keeps the w cheapest partial orders (quickselect on the cost so far).
function insRun(IB) {
  const { start, w } = IB;
  insCopy(IB.cur[0], start); IB.cur[0].g = 0;
  let ncur = 1;
  const steps = start.nb;
  for (let s = 0; s < steps; s++) {
    let nc = 0;
    for (let i = 0; i < ncur; i++) for (let j = 0; j < IB.cur[i].nb; j++) { IB.cg[nc] = IB.cur[i].g + insCost(IB.cur[i], j); IB.cp[nc] = i; IB.cj[nc] = j; IB.ord[nc] = nc; nc++; }
    let k = nc;
    if (k > w) {
      const o = IB.ord, g = IB.cg; let lo = 0, hi = nc - 1;
      while (lo < hi) {
        const mid = lo + ((hi - lo) >> 1); let t = o[mid]; o[mid] = o[hi]; o[hi] = t;
        let i = lo;
        for (let j = lo; j < hi; j++) if (g[o[j]] < g[o[hi]]) { t = o[i]; o[i] = o[j]; o[j] = t; i++; }
        t = o[i]; o[i] = o[hi]; o[hi] = t;
        if (i === w) break;
        if (i < w) lo = i + 1; else hi = i - 1;
      }
      k = w;
    }
    for (let x = 0; x < k; x++) {
      const c = IB.ord[x], nx = IB.nxt[x];
      insCopy(nx, IB.cur[IB.cp[c]]); insApply(nx, IB.cj[c]); nx.g = IB.cg[c];
      IB.cpar[s * w + x] = IB.cp[c]; IB.choice[s * w + x] = IB.cj[c];
    }
    [IB.cur, IB.nxt] = [IB.nxt, IB.cur]; ncur = k;
  }
  let p = 0;
  for (let q = 1; q < ncur; q++) if (IB.cur[q].g + IB.cur[q].ca < IB.cur[p].g + IB.cur[p].ca) p = q;
  for (let s = steps - 1; s >= 0; s--) { IB.order[s] = IB.choice[s * w + p]; p = IB.cpar[s * w + p]; }
  return steps;
}
function bucketSolve(X, lo, m) {
  const { mach, E, IB } = X;
  if (!bucketExtract(mach, lo, m, IB.start)) return false;
  if (IB.start.na > 0) { bucketLis(E, IB.start); if (!bucketExtract(mach, lo, m, IB.start)) return false; }
  const steps = insRun(IB), c = IB.work;
  insCopy(c, IB.start);
  for (let s = 0; s < steps; s++) { insCost(c, IB.order[s]); emitRot(E, DA, DB); E(PA); insApply(c, IB.order[s]); }
  emitRot(E, -c.ca, 0);
  return true;
}
function insBeam(b, w) {
  const len = b + 1, cells = len * w;
  return { w, start: newCl(b), work: newCl(b), cur: Array.from({ length: w }, () => newCl(b)), nxt: Array.from({ length: w }, () => newCl(b)),
    cg: new Int32Array(cells), cp: new Int32Array(cells), cj: new Int32Array(cells), ord: new Int32Array(cells),
    cpar: new Int32Array(cells), choice: new Int32Array(cells), order: new Int32Array(len) };
}

// ---- entry points --------------------------------------------------------------------------------
// Four-End Quicksort with DP Splits. leaf: 'beam' (Beam Leaf), 5 (BFS Leaf), 4 (Distance Tables)
// or 1 (no Finisher).
export function plannedQuick(m, { leaf = 'beam' } = {}) {
  const n = m.a.length;
  if (n === 0) return;
  BM.w = Math.min(BEAM_W, Math.max(BEAM_WMIN, Math.trunc(BEAM_WORK / n)));
  BM.keyHi.fill(0); BM.keyLo.fill(0); BM.gen = 0;
  const X = { mach: m, E: emitter(m), kind: leaf, dp: planner(leaf, n) };
  qsChunk(X, TA, 0, n);
}
// Bucket Beam: the same planned splits, down to buckets of at most ceil(sqrt(n)) values, each
// sorted by insertion around its longest increasing run in the order a beam finds cheapest.
export function bucketBeam(m) {
  const n = m.a.length;
  if (n === 0) return;
  let b = 1; while (b * b < n) b++;
  const w = Math.min(INS_W, Math.max(1, Math.trunc(INS_WORK / (b * b))));
  const X = { mach: m, E: emitter(m), kind: 'bucket', dp: planner('bucket', n, b), IB: insBeam(b, w) };
  qsChunk(X, TA, 0, n);
}
