// Data integrity (spec/10): cards.json fields, compat.json names, and agreement with spec/04.
import { readFile } from 'node:fs/promises';
import { ALGOS, TECHS, ROLES, techById, byId } from '../js/cards/index.js';
import { loadData } from '../js/core/data.js';
import { ok, eq } from './assert.mjs';

export const tests = [
  ['compat.json matches the card modules (run tools/build-data.mjs after changing a card)', async () => {
    const c = await loadData('compat');
    eq(Object.keys(c.algorithms).sort(), ALGOS.map(a => a.id).sort());
    eq(Object.keys(c.techniques).sort(), TECHS.map(t => t.id).sort());
    for (const a of ALGOS) eq(c.algorithms[a.id].open, a.open, a.id);
  }],
  ['every native, default, requirement, conflict and host names an existing card or role', () => {
    const known = id => techById[id] || !/^[a-z0-9]+(-[a-z0-9]+)+$/.test(id);   // anything not shaped like an id is plain words
    for (const a of ALGOS) {
      for (const [role, id] of [...Object.entries(a.natives), ...Object.entries(a.defaults)]) { ok(ROLES.includes(role), `${a.id} role ${role}`); ok(known(id), `${a.id} → ${id}`); if (techById[id]) eq(techById[id].role, role, `${a.id} ${id}`); }
      for (const r of a.open) ok(ROLES.includes(r), `${a.id} open ${r}`);
      for (const f of a.finishers || []) eq(techById[f]?.role, 'leaf', `${a.id} finisher ${f}`);
      ok(a.slots <= a.open.length, `${a.id} has ${a.slots} slots but ${a.open.length} open roles`);
    }
    for (const t of TECHS) {
      for (const c of t.conflicts) ok(techById[c], `${t.id} conflicts with ${c}`);
      for (const r of t.requires) { if (typeof r === 'string') ok(ROLES.includes(r), `${t.id} requires ${r}`); else { ok(ROLES.includes(r.role)); if (r.card) ok(techById[r.card]); if (r.hostDefault) ok(techById[r.hostDefault]); } }
      for (const h of t.hosts || []) ok(byId[h], `${t.id} host ${h}`);
    }
  }],
  ['cards.json has the required fields and text from the spec for every card', async () => {
    const c = await loadData('cards');
    for (const a of ALGOS) { const x = c.algorithms[a.id]; ok(x && x.name && x.family && x.doc.length > 100, `${a.id} doc`); }
    for (const t of TECHS) { const x = c.techniques[t.id]; ok(x && x.role && x.doc.length > 20, `${t.id} doc`); }
    for (const id of ['portfolio', 'adaptive-selector']) ok(c.meta[id].doc.length > 100, id);
  }],
  ['the role table in spec/04 agrees with the modules (slots and open roles)', async () => {
    const md = await readFile(new URL('../spec/04-compatibility.md', import.meta.url), 'utf8');
    const rows = md.split('\n').filter(l => /^\| [A-Z]/.test(l) && !l.startsWith('| algorithm'));
    let n = 0;
    for (const row of rows) {
      const [name, slots, , open] = row.split('|').slice(1, -1).map(s => s.trim());
      const a = ALGOS.find(x => x.name === name); if (!a) continue; n++;
      eq(+slots, a.slots, `${name} slots`);
      const roles = open === '—' ? [] : open.replace(/\([^)]*\)/g, '').split(',').map(s => s.trim().split(/[ (~]/)[0]);
      eq(roles, a.open, `${name} open roles`);
    }
    eq(n, ALGOS.length, 'rows found');
  }],
];
