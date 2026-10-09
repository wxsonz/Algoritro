// Independent checker: re-derives every state from the input and the op list. It shares no
// code with machine.js on purpose, so a bug in one cannot hide a bug in the other.
const VALID = new Set(['sa', 'sb', 'ss', 'pa', 'pb', 'ra', 'rb', 'rr', 'rra', 'rrb', 'rrr']);

export function replay(input, ops, { keepStates = false } = {}) {
  let A = input.slice(), B = [];
  const states = keepStates ? [[A.slice(), B.slice()]] : null;
  for (let k = 0; k < ops.length; k++) {
    const o = ops[k];
    if (!VALID.has(o)) return { ok: false, error: `op ${k}: unknown "${o}"`, a: A, b: B, states };
    if (o === 'pa') { if (B.length) A = [B[0], ...A], B = B.slice(1); }
    else if (o === 'pb') { if (A.length) B = [A[0], ...B], A = A.slice(1); }
    else {
      if (o === 'sa' || o === 'ss') A = swapTop(A);
      if (o === 'sb' || o === 'ss') B = swapTop(B);
      if (o === 'ra' || o === 'rr') A = A.length > 1 ? [...A.slice(1), A[0]] : A;
      if (o === 'rb' || o === 'rr') B = B.length > 1 ? [...B.slice(1), B[0]] : B;
      if (o === 'rra' || o === 'rrr') A = A.length > 1 ? [A[A.length - 1], ...A.slice(0, -1)] : A;
      if (o === 'rrb' || o === 'rrr') B = B.length > 1 ? [B[B.length - 1], ...B.slice(0, -1)] : B;
    }
    if (states) states.push([A.slice(), B.slice()]);
  }
  let sorted = B.length === 0;
  for (let i = 1; sorted && i < A.length; i++) if (A[i - 1] > A[i]) sorted = false;
  return { ok: sorted && A.length === input.length, a: A, b: B, states, error: sorted ? null : 'A is not sorted or B is not empty' };
}
const swapTop = s => s.length > 1 ? [s[1], s[0], ...s.slice(2)] : s;
