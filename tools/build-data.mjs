// Builds the static data the pages load:
//   data/compat.json   roles, natives, defaults, requires, conflicts (from the card modules)
//   data/cards.json    card text (from spec/cards/*.md and spec/techniques/*.md) and scored stats
//   data/seeds.json    the fixed seed lists per n (spec/09)
// Usage: node tools/build-data.mjs
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { ALGOS, TECHS, CURSED, META, ROLES } from '../js/cards/index.js';

const ROOT = new URL('..', import.meta.url), at = p => new URL(p, ROOT);
await mkdir(at('data/'), { recursive: true });
const write = async (name, obj) => { await writeFile(at(`data/${name}.json`), JSON.stringify(obj, null, 1) + '\n'); console.log('wrote data/' + name + '.json'); };

// compat.json
const compat = {
  roles: ROLES,
  algorithms: Object.fromEntries(ALGOS.map(a => [a.id, { slots: a.slots, natives: a.natives, open: a.open, defaults: a.defaults, finisher: a.finisher ?? null, finishers: a.finishers || [], caveats: a.caveats || {} }])),
  techniques: Object.fromEntries(TECHS.map(t => [t.id, { role: t.role, requires: t.requires, conflicts: t.conflicts, hosts: t.hosts || null, always: !!t.always, unbuildable: t.unbuildable || null }])),
};
await write('compat', compat);

// cards.json: the spec's sections, keyed by card id.
const norm = s => s.toLowerCase().replace(/[`*]/g, '').replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const sections = [];
for (const dir of ['spec/cards/', 'spec/techniques/']) {
  for (const f of (await readdir(at(dir))).filter(f => f.endsWith('.md') && f !== 'README.md')) {
    const md = await readFile(at(dir + f), 'utf8');
    for (const part of md.split(/\n(?=## )/).slice(1)) {
      const [head, ...body] = part.split('\n');
      const title = head.replace(/^## /, ''), name = title.split(' — ')[0];
      sections.push({ file: dir + f, name, key: norm(name), tagline: (title.split(' — ')[1] || '').replace(/^\*"?|"?\*$/g, ''), body: body.join('\n').replace(/\n---\s*$/, '').trim() });
    }
  }
}
const find = card => sections.find(s => s.key === norm(card.name)) || sections.find(s => s.key.startsWith(norm(card.name)) || norm(card.name).startsWith(s.key));
// The leaf cards are rows of a table in spec/techniques/leaf.md.
const leafMd = await readFile(at('spec/techniques/leaf.md'), 'utf8');
const leafRow = name => leafMd.split('\n').find(l => l.startsWith('| ' + name.split(' (')[0]));
const cursedMd = await readFile(at('spec/cards/cursed.md'), 'utf8');
const metaSec = id => sections.find(s => s.key === norm(META.find(m => m.id === id).name));
const cards = { algorithms: {}, techniques: {}, meta: {}, cursed: {} };
const missing = [];
for (const a of ALGOS) { const s = find(a); if (!s) missing.push(a.name); cards.algorithms[a.id] = { kind: 'algorithm', name: a.name, tagline: a.tagline, family: a.family, rarity: a.rarity, grasp: a.grasp, craft: a.craft, knows: a.concepts, fns: a.fns, from: a.from, claimedClass: a.claimedClass, proof: a.proof, doc: s?.body || '', source: s?.file }; }
for (const t of TECHS) {
  let doc = '', source;
  // A Finisher's text: its idea, then its quality and notes. Columns: card, size, quality, Grasp, Craft, notes, idea.
  if (t.role === 'leaf') { const row = leafRow(t.name), c = row ? row.split('|').slice(1, -1).map(x => x.trim()) : []; doc = row ? `**The idea.** ${c[6]}\n\n**Under the hood.** ${c[2]}. ${c[5]}` : ''; source = 'spec/techniques/leaf.md'; }
  else { const s = find(t); if (s) { doc = s.body; source = s.file; } else missing.push(t.name); }
  cards.techniques[t.id] = { kind: 'technique', name: t.name, tagline: t.tagline || '', role: t.role, rarity: t.rarity, grasp: t.grasp, craft: t.craft, effect: t.effect, doc, source };
}
for (const m of META) { const s = metaSec(m.id); cards.meta[m.id] = { kind: 'meta', name: m.name, tagline: m.tagline, rarity: m.rarity, grasp: m.grasp, craft: m.craft, doc: s?.body || '', source: 'spec/cards/meta.md' }; }
const cursedLore = (cursedMd.match(/\*\*Lore\.\*\*[^\n]*(\n(?!\n)[^\n]*)*/) || [''])[0];
for (const c of CURSED) cards.cursed[c.id] = { kind: 'cursed', name: c.name, why: c.why, lesson: c.lesson || '', playable: c.playable, fixedBy: c.fixedBy || null, doc: '', source: 'spec/cards/cursed.md' };
await write('cards', { generated: new Date().toISOString().slice(0, 10), cursedLore, ...cards });
if (missing.length) console.log('no spec section for:', missing.join(', '));

// seeds.json: S seeds per n (spec/03: 50 at n=100, 20 at n=500), the same everywhere.
const seeds = {}; for (const n of [3, 5, 7, 16, 20, 32, 64, 100, 128, 200, 256, 500, 512, 1000, 2048, 4096]) seeds[n] = Array.from({ length: n <= 100 ? 50 : n <= 500 ? 20 : 8 }, (_, i) => 1000 + i);
await write('seeds', seeds);

