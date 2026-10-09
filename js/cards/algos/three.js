// Hardcoded Three: max on top → ra, max in the middle → rra, then sa if the top two are out of order.
export function sortThree(m) {
  const a = m.a; if (a.length < 2) return;
  if (a.length === 2) { if (a[0] > a[1]) m.why('two values out of order').op('sa'); return; }
  const mx = Math.max(a[0], a[1], a[2]);
  if (a[0] === mx) m.why('the max is on top').op('ra');
  else if (a[1] === mx) m.why('the max is in the middle').op('rra');
  if (m.a[0] > m.a[1]) m.why('the top two are out of order').op('sa');
}
export default {
  id: 'hardcoded-three', kind: 'algorithm', family: 'small', name: 'Hardcoded Three', tagline: 'Six cases, no thinking',
  rarity: 'common', claimedClass: '1', proof: 'yes', grasp: 2, craft: 2, lines: 20, slots: 0, maxN: 3, playsAs: 'hardcoded-three',
  run(m) { m.phase('three'); sortThree(m); },
};
