// Loads data/*.json: fetch() in the browser, fs in Node. Nothing imports JSON as a module.
const cache = new Map();

export async function loadData(name) {
  if (cache.has(name)) return cache.get(name);
  let json;
  if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
    const { readFile } = await import('node:fs/promises');
    const url = new URL(`../../data/${name}.json`, import.meta.url);
    try { json = JSON.parse(await readFile(url, 'utf8')); } catch (e) { if (e.code === 'ENOENT') json = null; else throw e; }
  } else {
    const base = typeof document !== 'undefined' ? document.baseURI : self.location.href;
    const res = await fetch(new URL(`data/${name}.json`, base.replace(/js\/workers\/[^/]*$/, '')));
    json = res.ok ? await res.json() : null;
  }
  cache.set(name, json);
  return json;
}
