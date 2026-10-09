// The card registry: every Algorithm, Technique, Meta and Cursed card.
import three from './algos/three.js';
import fiveHand from './algos/five-hand.js';
import oracle from './algos/oracle.js';
import bubbleWheel from './algos/bubble-wheel.js';
import minExtract from './algos/min-extract.js';
import twinExtract from './algos/twin-extract.js';
import insertIntoB from './algos/insert-into-b.js';
import simpleInsertion from './algos/simple-insertion.js';
import lisInsertion from './algos/lis-insertion.js';
import turk from './algos/turk.js';
import chunks from './algos/chunks.js';
import butterfly from './algos/butterfly.js';
import bucketInsertion from './algos/bucket-insertion.js';
import lsdRadix from './algos/lsd-radix.js';
import ternaryRadix from './algos/ternary-radix.js';
import msdRadix from './algos/msd-radix.js';
import quick2 from './algos/quick-2way.js';
import fourEnd from './algos/four-end-quicksort.js';
import tapeMerge from './algos/tape-merge.js';
import naturalMerge from './algos/natural-merge.js';
import lookahead from './algos/lookahead-greedy.js';
import beamSorter from './algos/beam-sorter.js';
import annealer from './algos/annealer.js';
import PREP from './techniques/prep.js';
import SLOTS from './techniques/slots.js';
import LEAVES from './techniques/leaf.js';
import POST from './techniques/post.js';
import CURSED from './cursed.js';
import META from './meta.js';
import { tally } from './stats.js';

export const ALGOS = [three, fiveHand, oracle, bubbleWheel, minExtract, twinExtract, insertIntoB, simpleInsertion, lisInsertion, turk,
  chunks, butterfly, bucketInsertion, lsdRadix, ternaryRadix, msdRadix, quick2, fourEnd, tapeMerge, naturalMerge, lookahead, beamSorter, annealer]
  .map(a => ({ natives: {}, open: [], defaults: {}, slots: 0, params: {}, ...a }));
export const TECHS = [...PREP, ...SLOTS, ...LEAVES, ...POST];
export { CURSED, META };
export const byId = Object.fromEntries(ALGOS.map(a => [a.id, a]));
export const techById = Object.fromEntries(TECHS.map(t => [t.id, t]));
export const cursedById = Object.fromEntries(CURSED.map(c => [c.id, c]));
export const ROLES = ['anchor', 'pick', 'cost', 'sweep', 'band', 'retrieval', 'ends', 'split', 'pivot', 'order'];
export const FREE_ROLES = ['prep', 'post', 'leaf'];

export const FAMILIES = {
  small: { icon: '◆', name: 'Small' }, selection: { icon: '▲', name: 'Selection' }, insertion: { icon: '●', name: 'Insertion' },
  bucket: { icon: '■', name: 'Bucket' }, digit: { icon: '♦', name: 'Digit' }, divide: { icon: '✦', name: 'Divide' }, search: { icon: '✺', name: 'Search' },
};
// Grasp and Craft (spec/03 §3.2), from each card's concepts and functions. An Algorithm card
// counts with its natives, defaults and default Finisher and the cards always in play; a technique
// counts alone, with what it brings. Neither counts the base kit, which is a build's.
export const ALWAYS = TECHS.filter(t => t.always);
export const findCard = id => techById[id] || byId[id] || null;
export function bareCards(a) {
  const ids = [...Object.values(a.natives), ...Object.values(a.defaults), ...(a.finisher && a.finisher !== 'built-in' ? [a.finisher] : [])];
  return [a, ...ids.map(id => techById[id]).filter(Boolean), ...ALWAYS];
}
for (const a of ALGOS) { const T = tally(bareCards(a), { find: findCard }); a.grasp = T.grasp; a.craft = T.craft; a.concepts = T.concepts; }
for (const t of [...TECHS, ...META]) { const T = tally([t], { find: findCard }); t.grasp = T.grasp; t.craft = T.craft; t.concepts = T.concepts; }
// Display name of a card or of a plain-words native / default.
export const label = id => techById[id]?.short || techById[id]?.name || byId[id]?.name || id;
