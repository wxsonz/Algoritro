// Selection and Digit engines, ported from spec/measure-sim.js and spec/sim/cards.mjs.

// Bubble Wheel: bubble sort using only A. A pass is n−1 × (sa if out of order, ra) plus one ra.
export function bubbleWheel(m) {
  const n = m.a.length, sorted = () => m.a.every((x, k) => x === k);
  for (let p = 0; p < 2 * n && !sorted(); p++) {
    m.phase(`pass ${p + 1}`);
    for (let i = 0; i < n - 1; i++) { if (m.a[0] > m.a[1]) m.why(`${m.a[0]} > ${m.a[1]}: swap`).op('sa'); m.why('turn the wheel').op('ra'); }
    m.why('complete the revolution').op('ra');
  }
  m.phase('align').why('rotate the minimum to the top').bring('a', m.a.indexOf(0));
}

// Twin Extract: bring the closer of min and max to the top. A min goes pb; a max goes pb + rb.
// Return: pa the mins; pa the maxes (largest first), then rotate that block to A's bottom.
export function twinExtract(m, { rest = 3, finish } = {}) {
  let j = 0;
  m.phase('extract');
  while (m.a.length > rest) {
    const A = m.a, L = A.length; let imn = 0, imx = 0;
    for (let i = 1; i < L; i++) { if (A[i] < A[imn]) imn = i; if (A[i] > A[imx]) imx = i; }
    const cmn = Math.min(imn, L - imn), cmx = Math.min(imx, L - imx);
    if (cmn <= cmx) m.focus({ mover: A[imn] }).why(`the min (${A[imn]}) is ${cmn} away, the max ${cmx}: push the min`).bring('a', imn).op('pb');
    else { m.focus({ mover: A[imx] }).why(`the max (${A[imx]}) is ${cmx} away, the min ${cmn}: push it and sink it`).bring('a', imx).op('pb'); m.op('rb'); j++; }
  }
  m.focus(null).phase('finish'); finish(m);
  m.phase('return');
  const mins = m.b.length - j;
  m.why('return the mins'); for (let k = 0; k < mins; k++) m.op('pa');
  m.why('return the maxes, largest first'); for (let k = 0; k < j; k++) m.op('pa');
  if (j) { m.why('rotate the block of maxes to the bottom'); if (j <= m.a.length - j) m.op('ra', j); else m.op('rra', m.a.length - j); }
}

// LSD Radix. skipSorted: stop when A is already sorted.
export function lsdRadix(m, { skipSorted = false } = {}) {
  const n = m.a.length; let bits = 0; while (((n - 1) >> bits) > 0) bits++;
  for (let b = 0; b < bits; b++) {
    if (skipSorted && m.a.every((x, k) => x === k)) break;
    m.phase(`bit ${b}`).overlay('bit', b);
    for (let i = 0; i < n; i++) { const x = m.a[0]; if ((x >> b) & 1) m.why(`bit ${b} of ${x} is 1: keep it in A`).op('ra'); else m.why(`bit ${b} of ${x} is 0: push it`).op('pb'); }
    while (m.b.length) m.why(`gather bit ${b}'s zeros back on top`).op('pa');
  }
}

// Ternary LSD radix. 'spec': digit 0 → pb rb, 1 → pb, 2 → ra; gather the 1s with pa, then the
// 0s with rrb + pa. 'best': per pass, the cheaper top/bottom assignment, or the binary scheme
// when only two digits occur. No-op rotations are not emitted.
export function ternaryRadix(m, { mode = 'spec' } = {}) {
  const n = m.a.length; let passes = 0; while (3 ** passes < n) passes++;
  const rot = o => { if (m.b.length > 1) m.op(o); };
  for (let p = 0; p < passes; p++) {
    const dig = x => Math.floor(x / 3 ** p) % 3, cnt = [0, 0, 0]; for (const x of m.a) cnt[dig(x)]++;
    m.phase(`digit ${p}`).overlay('bit', `trit ${p}`);
    if (mode === 'best' && cnt.filter(c => c > 0).length <= 2) {
      const hi = cnt[2] ? 2 : 1;
      for (let i = 0; i < n; i++) { if (dig(m.a[0]) === hi) m.why(`digit ${hi}: stays`).op('ra'); else m.why('the lower digit: push').op('pb'); }
      while (m.b.length) m.why('gather').op('pa');
      continue;
    }
    const bottom = mode === 'best' ? (cnt[0] <= cnt[1] ? 0 : 1) : 0, top = 1 - bottom;
    for (let i = 0; i < n; i++) {
      const d = dig(m.a[0]);
      if (d === 2) m.why(`digit 2: stays in A`).op('ra');
      else if (d === top) m.why(`digit ${d}: top of B`).op('pb');
      else { m.why(`digit ${d}: bottom of B`).op('pb'); rot('rb'); }
    }
    if (bottom === 0) { m.why('gather the 1s'); for (let k = 0; k < cnt[1]; k++) m.op('pa'); m.why('gather the 0s from B\'s bottom'); for (let k = 0; k < cnt[0]; k++) { rot('rrb'); m.op('pa'); } }
    else { m.why('gather the 1s from B\'s bottom'); for (let k = 0; k < cnt[1]; k++) { rot('rrb'); m.op('pa'); } m.why('gather the 0s'); for (let k = 0; k < cnt[0]; k++) m.op('pa'); }
  }
}
