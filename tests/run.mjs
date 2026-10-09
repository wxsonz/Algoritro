// Runs every tests/*.test.mjs. Each file exports `tests`: a list of [name, fn]. No framework.
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
let pass = 0, fail = 0;
for (const f of readdirSync(dir).filter(f => f.endsWith('.test.mjs') && (!only || f.includes(only))).sort()) {
  const { tests } = await import(pathToFileURL(join(dir, f)));
  for (const [name, fn] of tests) {
    const t = Date.now();
    try { await fn(); pass++; console.log(`  ok   ${f.replace('.test.mjs', '')}: ${name} (${Date.now() - t} ms)`); }
    catch (e) { fail++; console.log(`  FAIL ${f.replace('.test.mjs', '')}: ${name}\n       ${e.message}`); }
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
