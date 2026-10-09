// Named decks and builds (spec/05 §5.2, §5.4), with their reference numbers from spec/sim/results.md.
const H = (algo, techs = [], extra = {}) => ({ algo, techs, sharing: true, sandbox: true, ...extra });

export const DECKS = [
  { id: 'the-first-step', name: 'The First Step', hand: H('min-extract'), sim: [1454, 32298], note: 'the honest baseline' },
  { id: 'bit-grinder', name: 'Bit Grinder', hand: H('lsd-radix'), sim: [1084, 6784], note: 'the most common first "fast" deck; 6784 is also the subject\'s own example count' },
  { id: 'crate-runner', name: 'Crate Runner', hand: H('chunks', ['one-way-sweep', 'second-max-lookahead'], { presets: { K: 'round(0.4√n) (tuned)' } }), sim: [606, 5247], note: 'a provable n√n deck, EXCELLENT on every sim run' },
  { id: 'butterfly-net', name: 'Butterfly Net', hand: H('butterfly'), sim: [577, 5080], note: 'short code, but a constant w breaks its class claim; w = round(1.4√n) fixes it at the same cost' },
  { id: 'careful-crates', name: 'Careful Crates', hand: H('bucket-insertion'), sim: [606, 4291], ref: [576, 4121], note: 'the provable n√n champion: beats Turk at n=500' },
  { id: 'the-turk', name: 'The Turk', hand: H('turk'), sim: [557, 5088], note: 'the 42 classic; its class is O(n²), so it cannot be the n log n method' },
  { id: 'split-second', name: 'Split Second', hand: H('quick-2way'), sim: [718, 5235], note: 'provable n log n that sees existing order, but only GOOD at n=100' },
  { id: 'long-line', name: 'Long Line', hand: H('lis-insertion', ['four-way-cost', 'rb-sink']), sim: [530, 4425], note: 'best O(n²) seed deck' },
  { id: 'four-corners', name: 'Four Corners', hand: H('four-end-quicksort', ['pivot-by-leaf-count', 'bfs-leaf', 'peephole-cancel', 'peephole-fuse']), sim: [533, 3825], ref: [528, 3824], note: 'the provable n log n champion; the sim reproduces the reference build' },
  { id: 'oracles-plan', name: 'Oracle\'s Plan', hand: H('four-end-quicksort', ['dp-splits', 'bfs-leaf', 'peephole-cancel', 'peephole-fuse']), sim: [523, 3667], ref: [420, 3111], note: 'the Legendary deck, without Beam Leaf and Portfolio, which are not built yet' },
];
export const deckById = Object.fromEntries(DECKS.map(d => [d.id, d]));

// Builds: an Adaptive Selector around a simple, a medium and a complex hand.
const D = id => deckById[id].hand;
export const BUILDS = [
  { id: 'radix-build', name: 'Radix build', simple: D('the-first-step'), medium: H('chunks'), complex: D('bit-grinder'), sim: [884, 6380] },
  { id: 'turk-build', name: 'Turk build', simple: D('the-first-step'), medium: D('butterfly-net'), complex: D('the-turk'), sim: [564, 5077] },
  { id: 'provable-build', name: 'Provable build', simple: D('long-line'), medium: H('butterfly', [], { presets: { w: 'round(1.4√n)' } }), complex: D('split-second'), sim: [651, 5155] },
  { id: 'strong-build', name: 'Strong build', simple: D('long-line'), medium: D('careful-crates'), complex: D('four-corners'), sim: [566, 4038] },
  { id: 'strong-build-crates', name: 'Strong build (Crate Runner)', simple: D('long-line'), medium: D('crate-runner'), complex: D('four-corners'), sim: [566, 4485] },
];
