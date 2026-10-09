// Every hand a card can hold: each open role empty (its default) or filled by a fitting card,
// and each Finisher it accepts. Prep and post cards fit every hand and are tested on their own.
import { techById, TECHS } from '../cards/index.js';
import { fits, resolve } from './hand.js';

export function roleOptions(algo) {
  const out = {};
  for (const role of algo.open) out[role] = [null, ...TECHS.filter(t => t.role === role && fits(algo, t).ok).map(t => t.id)];
  return out;
}
export function finisherOptions(algo) {
  if (!algo.finishers) return [undefined];
  return [undefined, ...(algo.finisher ? [] : []), ...algo.finishers.filter(id => fits(algo, techById[id]).ok)];
}
// All combinations; legal ones resolve, illegal ones (requires, conflicts) are returned apart.
export function allHands(algo) {
  const opts = roleOptions(algo), roles = Object.keys(opts), legal = [], illegal = [];
  const go = (i, techs) => {
    if (i === roles.length) {
      for (const f of finisherOptions(algo)) {
        const hand = { algo: algo.id, techs: f ? [...techs, f] : techs.slice(), sandbox: true, sharing: true };
        (resolve(hand).ok ? legal : illegal).push(hand);
      }
      return;
    }
    for (const o of opts[roles[i]]) go(i + 1, o ? [...techs, o] : techs);
  };
  go(0, []);
  return { legal, illegal };
}
