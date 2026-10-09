// Cursed cards: classic sorts that do not map well onto two stacks. The playable ones are naive
// ports through an array emulator on A, so the curse is visible: reaching position i costs
// min(i, m − i) rotations, and swapping two positions costs four pushes on top of that.
import { rng } from '../core/rng.js';

// A as an array. off is the logical index of A's top.
class Arr {
  constructor(m) { this.m = m; this.off = 0; }
  get len() { return this.m.a.length; }
  get(p) { return this.m.a[(p - this.off + this.len) % this.len]; }
  to(p) {
    const L = this.len; if (L < 2) { this.off = p; return; }
    const d = ((p - this.off) % L + L) % L;
    if (d <= L / 2) this.m.op('ra', d); else this.m.op('rra', L - d);
    this.off = p % L;
  }
  take(p) { this.to(p); this.m.op('pb'); this.off = this.len ? p % this.len : 0; }
  put(p) { if (this.len) this.to(p % this.len); this.m.op('pa'); this.off = p; }
  swap(i, j) {
    if (i === j) return; if (i > j) [i, j] = [j, i];
    this.m.why(`swap positions ${i} and ${j}`);
    if (j === i + 1) { this.to(i); this.m.op('sa'); return; }
    this.take(j); this.take(i); this.put(j - 1); this.put(i);
  }
  done() { this.m.phase('align').why('rotate position 0 to the top'); this.to(0); }
}

function heapsort(m) {
  const A = new Arr(m), n = A.len;
  const sift = (i, end) => { for (;;) { const l = 2 * i + 1, r = l + 1; let big = i; if (l < end && A.get(l) > A.get(big)) big = l; if (r < end && A.get(r) > A.get(big)) big = r; if (big === i) return; A.swap(i, big); i = big; } };
  m.phase('build heap'); for (let i = (n >> 1) - 1; i >= 0; i--) sift(i, n);
  m.phase('extract'); for (let end = n - 1; end > 0; end--) { A.swap(0, end); sift(0, end); }
  A.done();
}
function shellsort(m) {
  const A = new Arr(m), n = A.len;
  for (let gap = n >> 1; gap > 0; gap >>= 1) {
    m.phase(`gap ${gap}`);
    for (let i = gap; i < n; i++) for (let j = i; j >= gap && A.get(j - gap) > A.get(j); j -= gap) A.swap(j - gap, j);
  }
  A.done();
}
function pancake(m) {
  const A = new Arr(m), n = A.len;
  const flip = k => { m.why(`flip the top ${k}`); for (let i = 0; i < k >> 1; i++) A.swap(i, k - 1 - i); };
  for (let s = n; s > 1; s--) {
    m.phase(`place ${s - 1}`);
    let mi = 0; for (let i = 1; i < s; i++) if (A.get(i) > A.get(mi)) mi = i;
    if (mi === s - 1) continue;
    if (mi > 0) flip(mi + 1);
    flip(s);
  }
  A.done();
}
function cyclesort(m) {
  const A = new Arr(m), n = A.len;
  m.phase('cycles');
  for (let i = 0; i < n; i++) while (A.get(i) !== i) A.swap(i, A.get(i));
  A.done();
}
function bogosort(m) {
  const A = new Arr(m), n = A.len, rnd = rng(m.a.reduce((h, x) => h * 31 + x + 1, 7) >>> 0);
  const sorted = () => { for (let i = 0; i < n; i++) if (A.get(i) !== i) return false; return true; };
  let k = 0;
  while (!sorted()) { m.phase(`shuffle ${++k}`); for (let i = n - 1; i > 0; i--) A.swap(i, Math.floor(rnd() * (i + 1))); }
  A.done();
}
function stooge(m) {
  const A = new Arr(m);
  const go = (i, j) => { if (A.get(j) < A.get(i)) A.swap(i, j); if (j - i + 1 > 2) { const t = Math.floor((j - i + 1) / 3); go(i, j - t); go(i + t, j); go(i, j - t); } };
  m.phase('stooge'); if (A.len > 1) go(0, A.len - 1);
  A.done();
}

export default [
  { id: 'heapsort', name: 'Heapsort', playable: true, maxN: 500, run: heapsort, fixedBy: 'four-end-quicksort', claimed: 'n log n', real: 'n² ops',
    why: 'Sift-down jumps from i to 2i+1. The jumps along one sift-down double in length, so they add up to O(n) rotations, and n sift-downs cost O(n²) ops: quadratic, not n log n.' },
  { id: 'shell-sort', name: 'Shell sort', playable: true, maxN: 300, run: shellsort, fixedBy: 'butterfly', claimed: 'n^1.5', real: 'worse than n² ops',
    why: 'Gap comparisons need positions i and i+gap at the same time. With one swap op that only touches the top two, every gap compare costs about gap rotations, so the large-gap passes that make Shell sort fast are the most expensive here.' },
  { id: 'counting-sort', name: 'Counting sort', playable: false,
    why: 'Ranks already give every value\'s final position. The hard part was never knowing where a value goes, only moving it there.', lesson: 'Rank Compression is the counting part.' },
  { id: 'pancake-sort', name: 'Pancake sort', playable: true, maxN: 200, run: pancake, fixedBy: 'bubble-wheel', claimed: 'n flips', real: 'n² ops',
    why: 'Its prefix reversal is a single operation there. Here, reversing k values costs about 2k ops (the optimum is 5, 9, 11 and 14 ops for k = 3 to 6).' },
  { id: 'sorting-networks', name: 'Bitonic / sorting networks', playable: false,
    why: 'Fixed compare-exchange pairs at arbitrary distances need random access.' },
  { id: 'bogosort', name: 'Bogosort', playable: true, maxN: 6, run: bogosort, claimed: 'n · n! expected', real: 'a joke',
    why: 'Random shuffles. It is included as a joke and a lesson in expected cost.' },
  { id: 'cycle-sort', name: 'Cycle sort', playable: true, maxN: 500, run: cyclesort, claimed: 'n writes', real: 'n² ops',
    why: 'It minimises writes, but here moves are what cost, not writes. Following a cycle means rotating to each position.' },
  { id: 'merge-insertion', name: 'Merge insertion (Ford–Johnson)', playable: false,
    why: 'It sorts with the fewest comparisons known (1959), but push_swap counts moves, not comparisons.', lesson: 'Optimal for the wrong metric.' },
  { id: 'smoothsort', name: 'Smoothsort / Cartesian tree sort', playable: false,
    why: 'Adaptive in theory: nearly sorted input is cheap. But they keep a heap or tree over array positions, so they need random access, and they fall apart like heapsort.' },
  { id: 'stooge-sort', name: 'Stooge sort', playable: true, maxN: 30, run: stooge, claimed: 'n^2.7 compares', real: 'n^2.7 swaps, each with rotations',
    why: 'O(n^2.7) comparisons, made worse by rotations.' },
  { id: 'binary-indexed-tree', name: 'Binary indexed tree', playable: false,
    why: 'It answers rank and position queries in O(log n) CPU. That speeds up a planner, for example Cheapest Pick\'s slot search, but it moves no values: the op count still comes from the method it serves.' },
].map(c => ({ kind: 'cursed', family: 'cursed', ...c }));
