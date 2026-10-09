// The frame-rate probe: frames per second over 3 s on every page, at idle and (on the long pages)
// while scrolling, in headless Chromium without a GPU (the slow case). Needs the dev server
// (npm run dev) and chromium on PATH. Usage: node tools/perf.mjs [base-url]
// Exits 1 if a page drops under 50 fps at idle, the bar the Table was held to (objective §12).
import { spawn } from 'node:child_process';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/index\.html$/, ''), PORT = 9341, W = 1920, H = 1080;
const chrome = spawn('chromium', ['--headless', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => { try { chrome.kill(); } catch {} });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets; for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(), errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) pend.get(m.id)?.(m); if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result.result?.value; };
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
// Frames over 3 s; with scroll, the page scrolls down 2 px a frame meanwhile (about 120 px/s).
const FPS = scroll => `new Promise(r => { let n = 0, t0 = performance.now(), last = t0, worst = 0, long = 0; const f = t => { n++; const d = t - last; worst = Math.max(worst, d); if (d > 25) long++; last = t; ${scroll ? 'scrollBy(0, 2);' : ''} if (t - t0 < 3000) requestAnimationFrame(f); else r({ fps: +(n / ((t - t0) / 1000)).toFixed(1), worstMs: +worst.toFixed(1), over25ms: long }); }; requestAnimationFrame(f); })`;
const CASES = [
  ['Table, idle', 'index.html', false],
  ['Codex, every card face', 'codex.html', false], ['Codex, scrolling the faces', 'codex.html', true], ['Codex, a card page', 'codex.html#four-end-quicksort', false],
  ['Meta, tier list', 'meta.html', false], ['Meta, scrolling the tier list', 'meta.html', true], ['Meta, growth ratio', 'meta.html#growth', false],
  ['Lab, idle', 'lab.html', false],
];
const rows = []; let fail = false;
for (const [name, url, scroll] of CASES) {
  await send('Page.navigate', { url: 'about:blank' }); await sleep(50);
  await send('Page.navigate', { url: BASE + url }); await sleep(3500);
  const r = await ev(FPS(scroll));
  if (!scroll && r.fps < 50) fail = true;
  rows.push(`${(r.fps >= (scroll ? 40 : 50) ? 'ok  ' : 'SLOW')} ${name.padEnd(30)} ${String(r.fps).padStart(5)} fps · worst frame ${r.worstMs} ms · ${r.over25ms} frames over 25 ms`);
}
console.log(rows.join('\n'));
if (errors.length) console.log('page errors:', errors);
chrome.kill(); process.exit(fail || errors.length ? 1 : 0);
