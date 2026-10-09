// The browser's half of the stack cache: results kept in IndexedDB across visits, under the
// version of the measuring code, so an update never serves stale numbers. Everything here may
// fail (private windows, blocked storage); the Table then simply measures again.
const DB = 'algoritro', STORE = 'cells', SEP = '\t';
let dbp = null;
const open = () => (dbp ??= new Promise(res => {
  try {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
  } catch { res(null); }
}));
// Every kept record of this version: cells ('C', a legal hand's 16 post subsets) and single
// results ('H', any other hand). Records of other versions are deleted.
export async function loadAll(version) {
  const db = await open(); if (!db) return { cells: [], hands: [] };
  return new Promise(res => {
    const cells = [], hands = [], stale = [];
    try {
      const tx = db.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE), req = st.openCursor();
      req.onsuccess = () => {
        const c = req.result; if (!c) return;
        const [kind, v, ...rest] = String(c.key).split(SEP);
        if (v !== version) stale.push(c.key); else (kind === 'C' ? cells : hands).push([rest, c.value]);
        c.continue();
      };
      tx.oncomplete = () => { res({ cells, hands }); if (stale.length) drop(stale); };
      tx.onerror = () => res({ cells, hands });
    } catch { res({ cells, hands }); }
  });
}
async function drop(keys) { const db = await open(); try { const st = db.transaction(STORE, 'readwrite').objectStore(STORE); for (const k of keys) st.delete(k); } catch { /* best effort */ } }
// Writes are batched: a fill keeps thousands of records.
let pending = [], timer = 0;
export function keepCell(version, base, stackKey, cell) { queue(['C', version, base, stackKey].join(SEP), cell); }
export function keepHand(version, handKey, stackKey, rec) { queue(['H', version, handKey, stackKey].join(SEP), [rec.ops, rec.s, rec.worst]); }
function queue(k, v) { pending.push([k, v]); clearTimeout(timer); timer = setTimeout(flush, 500); }
async function flush() {
  const db = await open(), batch = pending; pending = [];
  if (!db || !batch.length) return;
  try { const st = db.transaction(STORE, 'readwrite').objectStore(STORE); for (const [k, v] of batch) st.put(v, k); } catch { /* best effort */ }
}
