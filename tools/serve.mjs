// Static server for the explorer, no dependencies. Usage: node tools/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = +(process.argv[2] || 8765);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown' };

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': (TYPES[extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'cache-control': 'no-store' }).end(body);
  } catch { res.writeHead(404).end('not found'); }
}).listen(PORT, '127.0.0.1', () => console.log(`Algoritro: http://127.0.0.1:${PORT}/`));
