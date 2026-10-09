// The version of the measuring code: a hash of the engines, the cards, the stacks, the jobs and the
// DP tables. data/stacks.json carries it; the browser keeps its cache under it, and a test fails
// when the code changes without a new precompute (node tools/precompute.mjs).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const walk = dir => readdirSync(new URL(dir, ROOT)).flatMap(f => statSync(new URL(dir + f, ROOT)).isDirectory() ? walk(dir + f + '/') : f.endsWith('.js') ? [dir + f] : []);
export function codeVersion() {
  const files = [...walk('js/core/'), ...walk('js/cards/'), 'js/workers/jobs.js', 'js/ui/stacks.js', 'data/dp-plans.json'].sort();
  const h = createHash('sha1');
  for (const f of files) h.update(f + '\0').update(readFileSync(new URL(f, ROOT)));
  return h.digest('hex').slice(0, 12);
}
