// Moves a hand makes on the study's inputs: Python-exact uniform values for each seed.
//   node tools/count.mjs <deck> <n> <seed>...      e.g. node tools/count.mjs beam-sorter 100 1000 1001
// <deck> is a deck string ("turk+rb-sink") or a named deck's id ("crate-runner").
// One JSON line per seed: { deck, n, seed, ops, valid, ms }. The study's reference builds compare
// their streams against it (study/explorer-refs/measure.py --explorer).
import { runHand, parseDeck } from '../js/core/hand.js';
import { generate, ranks } from '../js/core/input.js';
import { deckById } from '../js/cards/decks.js';

const [deck, n, ...seeds] = process.argv.slice(2);
if (!deck || !n || !seeds.length) { console.error('usage: node tools/count.mjs <deck> <n> <seed>...'); process.exit(2); }
for (const seed of seeds) {
  const r = runHand(deckById[deck]?.hand ?? parseDeck(deck), ranks(generate('uniform', +n, +seed)), { keepSteps: false });
  console.log(JSON.stringify({ deck, n: +n, seed: +seed, ops: r.ops.length, valid: r.valid, ms: Math.round(r.ms) }));
}
