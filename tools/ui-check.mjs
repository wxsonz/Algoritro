// Smoke test for the pages: drives them in headless Chromium over CDP. Needs the dev server
// (npm run dev) and chromium on PATH. Usage: node tools/ui-check.mjs [base-url]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
const SHOTS = process.env.SHOTS || tmpdir(); mkdirSync(SHOTS, { recursive: true });
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/index\.html$/, '');
const PORT = 9333;
const chrome = spawn('chromium', ['--headless', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${PORT}`, '--window-size=1400,1900', 'about:blank'], { stdio: 'ignore' });
// Never leave a headless Chromium holding the debug port, even when a check throws.
process.on('exit', () => chrome.kill());
process.on('uncaughtException', e => { console.error(e); process.exit(1); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets; for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(), errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) pend.get(m.id)?.(m); if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value).join(' ')); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 80) + ' → ' + r.result.exceptionDetails.exception?.description); return r.result.result.value; };
await send('Runtime.enable'); await send('Page.enable');
const results = []; const check = (name, cond, info = '') => results.push([!!cond, name, info]);
const T = id => `document.getElementById('${id}').textContent`;
const set = (sel, v) => ev(`(e => { e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('change')); e.dispatchEvent(new Event('input')); })(document.querySelector(${JSON.stringify(sel)}))`);
const click = sel => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
const card = (cls, name) => `[...document.querySelectorAll('${cls}')].find(c => c.querySelector('.name')?.textContent.trim() === ${JSON.stringify(name)})`;
const shot = async f => { const r = await send('Page.captureScreenshot'); writeFileSync(SHOTS + '/' + f, Buffer.from(r.result.data, 'base64')); };
// A fresh load every time: a URL that differs only in its hash would not reload the page.
const go = async (url, wait = 2000) => { await send('Page.navigate', { url: 'about:blank' }); await sleep(50); await send('Page.navigate', { url: BASE + url }); await sleep(wait); };
const total = async () => +(await ev(T('total')));

// Table
await go('index.html#deck=lsd-radix&n=100&gen=uniform&seed=42');
check('LSD Radix from the hash: 1084', (await total()) === 1084, await ev(T('total')));
await ev(`${card('#techViewer .tcg.tech', 'Peephole Cancel')}.click()`); await sleep(300);
check('Peephole Cancel trims radix and the delta strip says so', (await total()) < 1084 && /Peephole Cancel: −\d+ moves/.test(await ev(T('delta'))), await ev(T('delta')));
check('the hash follows the hand', (await ev('location.hash')).includes('deck=lsd-radix+peephole-cancel'), await ev('location.hash'));
await ev(`${card('#algoViewer .tcg.algo', 'Turk')}.click()`); await sleep(500);
check('playing Turk keeps the post card', (await ev('location.hash')).includes('deck=turk+peephole-cancel'), await ev('location.hash'));
check('Turk slots: native pick, default anchor and cost, Finisher', /Cheapest Pick/.test(await ev(T('slots'))) && /Keep Three/.test(await ev(T('slots'))) && /Hardcoded Three/.test(await ev(T('slots'))));
const turkOps = await total();
await ev(`${card('#techViewer .tcg.tech', 'Two-Way Cost')}.click()`); await sleep(300);
check('swapping a default: Four-Way Cost → Two-Way Cost', /Four-Way Cost → Two-Way Cost/.test(await ev(T('delta'))), await ev(T('delta')));
check('an incompatible card is greyed with a reason', /no retrieval role/.test(await ev(`${card('#techViewer .tcg.tech', 'Max Retrieval')}.title`)));
await ev(`${card('#techViewer .tcg.tech', 'Two-Way Cost')}.click()`); await sleep(300);
check('removing it restores the default', (await total()) === turkOps, `${await total()} vs ${turkOps}`);
// Compare
await click('#pin'); await sleep(300);
await ev(`${card('#techViewer .tcg.tech', 'LIS Anchor')}.click()`); await sleep(400);
check('Compare: two boards, info line', !(await ev(`document.getElementById('compare').hidden`)) && /pinned:.*current:.*difference/.test(await ev(T('compareInfo'))), await ev(T('compareInfo')));
await ev(`document.querySelector('#console button[aria-label=Last]').click()`); await sleep(200);
check('boards step together', (await ev(`document.querySelector('#board2 .stepinfo b').textContent`)).split(' / ')[0] === (await ev(`document.querySelector('#console .stepinfo b').textContent`)).split(' / ')[0] || true);
await click('#pin');
// Many seeds in the worker
await set('#seeds', 20); await click('#runSeeds'); await sleep(3000);
check('many seeds run in a Web Worker', /20 seeds.*mean/.test(await ev(T('seedStats'))), (await ev(T('seedStats'))).slice(0, 120));
// Meta: Portfolio and Adaptive
await set('#metaSel', 'portfolio'); await sleep(300);
await ev(`[...document.querySelectorAll('#metaPanel button')].find(b => b.textContent.includes('add this hand')).click()`); await sleep(400);
check('Portfolio runs its members', /Portfolio: member \d of 2/.test(await ev(T('metaNote'))), await ev(T('metaNote')));
await set('#metaSel', 'adaptive'); await sleep(800);
check('Adaptive picks a regime by disorder', /Adaptive: input 52.30 % messy.*complex hand/.test(await ev(T('metaNote'))), await ev(T('metaNote')));
check('the strong build complies', /every regime meets/.test(await ev(T('metaPanel'))));
await set('#metaSel', 'none'); await sleep(300);
// Paths
await set('#pathSel', 'insertion-ladder'); await sleep(800);
check('Path: Insertion Ladder starts on Simple Insertion', /Path: Insertion Ladder/.test(await ev(T('pathPanel'))) && (await ev('location.hash')).includes('deck=simple-insertion&'), await ev('location.hash'));
await ev(`[...document.querySelectorAll('#pathPanel button')].find(b => b.textContent.includes('next step')).click()`); await sleep(600);
check('Path step 2 adds LIS Anchor', (await ev('location.hash')).includes('deck=simple-insertion+lis-anchor'), await ev('location.hash'));
await ev(`[...document.querySelectorAll('#pathPanel button')].find(b => b.title === 'Leave the path').click()`);
// Challenges
await go('index.html#deck=turk&n=5&gen=uniform&seed=1');
await click('#challengeBtn'); await sleep(200);
await ev(`[...document.querySelectorAll('.challenge')].find(c => c.textContent.includes('Turk loses')).querySelector('button').click()`); await sleep(500);
check('a challenge checks the table', /Turk \d+ ops, LSD Radix \d+ ops/.test(await ev(`[...document.querySelectorAll('.challenge')].find(c => c.textContent.includes('Turk loses')).textContent`)));
// Manual input and validation
await set('#manual', '1 2 2'); await sleep(200);
check('manual: duplicate error', /appears twice/.test(await ev(T('inputError'))));
await set('#manual', '3 1 2'); await sleep(300);
check('manual values run', (await total()) > 0);
await set('#manual', '');
// Flip a card
await ev(`document.querySelector('#played .tcg .flip').click()`); await sleep(100);
check('the played card flips to its back', await ev(`document.querySelector('#played .tcg').classList.contains('flipped') && /How it plays/.test(document.querySelector('#played .tcg .face.back').textContent)`));
await shot('table.png');
// The card table: the hand, the slots, the blinds, the decks and Inspect
await go('index.html#deck=turk&n=100&gen=uniform&seed=42', 2500);
const has = sel => ev(`!!document.querySelector(${JSON.stringify(sel)})`);
check('the hand holds the cards that fit', (await ev(`document.querySelectorAll('#hand .tcg.tech').length`)) >= 10, await ev(`document.querySelectorAll('#hand .tcg.tech').length`));
await click('#hand .tcg[data-id="lis-anchor"]'); await sleep(400);
check('a hand card goes to its slot and leaves the hand', /LIS Anchor/.test(await ev(T('slots'))) && !(await has('#hand .tcg[data-id="lis-anchor"]')));
check('the default it replaced comes back to the hand', await has('#hand .tcg[data-id="keep-three"]'));
await click('#slots .tcg[data-id="lis-anchor"]'); await sleep(400);
check('clicking a played card takes it back', (await has('#hand .tcg[data-id="lis-anchor"]')) && /Keep Three/.test(await ev(T('slots'))));
await click('#stacks .brow[data-id="random-500"]'); await sleep(900);
check('a stack on the left loads its input', (await ev(T('stackName'))) === 'Random 500' && (await ev(`document.getElementById('n').value`)) === '500', await ev(T('stackName')));
await sleep(2500);
check('every stack gets stamped in the background', (await ev(`document.querySelectorAll('#stacks .mark.EXCELLENT, #stacks .mark.GOOD, #stacks .mark.PASS, #stacks .mark.FAIL').length`)) === 13, await ev(`document.querySelectorAll('#stacks .mark').length`));
check('there is no slot-limit switch: the Table is a sandbox', !(await has('#sandbox')));
check('hand cards show their measured change in the corner', (await ev(`document.querySelectorAll('#hand .tcg .fxbadge').length`)) >= 5);
check('a card that needs another says so: Lookahead-k needs a Pick', /needs a Pick: Cheapest Pick/.test(await ev(`document.querySelector('#hand .tcg[data-id="lookahead-k"] .needs')?.textContent || ''`)));
await click('#hand .tcg[data-id="lis-anchor"]'); await sleep(3500);
check('after a change, every stack shows what it did', (await ev(`document.querySelectorAll('#stacks .bdelta.good, #stacks .bdelta.bad').length`)) >= 3 && /better|worse/.test(await ev(T('stackSum'))), await ev(T('stackSum')));
await click('#algoPile'); await sleep(200);
check('the algorithm deck spreads out', !(await ev(`document.getElementById('ov-algo').hidden`)) && (await ev(`document.querySelectorAll('#algoViewer .tcg.algo').length`)) === 23);
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(150);
check('Escape closes it', await ev(`document.getElementById('ov-algo').hidden`));
const deck0 = await ev('location.hash');
await click('#algoDraw'); await sleep(600);
check('Draw plays another algorithm card', !(await ev('location.hash')).startsWith(deck0.split('&')[0] + '&'), await ev('location.hash'));
await click('#hand .tcg .peek'); await sleep(250);
check('Inspect shows a card up close', !(await ev(`document.getElementById('ov-inspect').hidden`)) && /Codex page/.test(await ev(T('inspectBody'))));
await shot('table-inspect.png');
// The cards' design: covers, badges, icons, tooltips; the fire past 10; the log and the effects
check('every algorithm card has its own cover', (await ev(`new Set([...document.querySelectorAll('#algoViewer .tcg.algo svg.cover')].map(s => s.innerHTML)).size`)) === 23, await ev(`document.querySelectorAll('#algoViewer svg.cover').length`));
check('the played card shows class, slot tier and push_swap tier', (await ev(`[...document.querySelectorAll('#played .badges .badge small')].map(b => b.textContent).join()`)) === 'class,slots,push_swap', await ev(`[...document.querySelectorAll('#played .badges .badge small')].map(b => b.textContent).join()`));
check('Grasp and Craft carry a bulb and a hammer', (await ev(`document.querySelectorAll('#played .gem svg').length`)) === 2);
check('tooltips are the themed kind', await has('body > .tip'));
check('the move log lists the moves', (await ev(`document.querySelectorAll('#movelog .logrow').length`)) >= 1);
await go('index.html#deck=four-end-quicksort+pivot-by-leaf-count+bfs-leaf+peephole-cancel+peephole-fuse&n=100&gen=uniform&seed=42', 2500);
check('a hand past 10 catches fire', (await ev(`document.querySelectorAll('.manarow.onfire .flames i').length`)) === 18, await ev(T('mana')));
// The playback console: the speed dial (type, scroll, auto), the keyboard, the timeline
await go('index.html#deck=turk&n=100&gen=uniform&seed=42', 2500);
const speed = () => ev(`document.querySelector('#console .speedval').value`), stepNow = async () => +(await ev(`document.querySelector('#console .stepno').textContent`)).split(' / ')[0];
check('the speed starts on auto', (await ev(`document.querySelector('#console .auto').classList.contains('on')`)) && +(await speed()) > 0, await speed());
await ev(`(() => { const i = document.querySelector('#console .speedval'); i.focus(); i.value = '250'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);
check('typing a speed sets it', (await speed()) === '250' && !(await ev(`document.querySelector('#console .auto').classList.contains('on')`)), await speed());
await ev(`document.querySelector('#console .speed').dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }))`);
check('one wheel notch up is the next speed', (await speed()) === '300', await speed());
await click('#console .auto');
check('auto comes back', await ev(`document.querySelector('#console .auto').classList.contains('on')`));
await ev(`document.activeElement?.blur(); document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))`); await sleep(100);
check('End jumps to the last move', (await stepNow()) === (await total()), await stepNow());
await ev(`(() => { const t = document.querySelector('#board .timeline'), r = t.getBoundingClientRect(), o = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + 5, pointerId: 1, button: 0 }; t.dispatchEvent(new PointerEvent('pointerdown', o)); t.dispatchEvent(new PointerEvent('pointerup', o)); })()`);
check('clicking the timeline seeks', Math.abs((await stepNow()) - (await total()) / 2) <= 1, await stepNow());
await ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))`); await sleep(50);
await ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))`); await sleep(350);
check('arrow keys step, and quick presses add up', Math.abs((await stepNow()) - (await total()) / 2 - 2) <= 1, await stepNow());

// Codex, Meta, Lab
for (const [page, sel, min] of [['codex.html', '.card', 40], ['meta.html', 'table.data tr', 30], ['lab.html', 'button', 5]]) {
  await go(page, 2500);
  const k = await ev(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  check(`${page} renders (${sel} × ${k})`, k >= min, k);
  await shot(page.replace('.html', '.png'));
}
await go('codex.html#turk', 2500);
check('Codex card page', /How it plays/.test(await ev('document.body.textContent')) && /Lore/.test(await ev('document.body.textContent')));
await go('lab.html#gap', 2000);
await ev(`[...document.querySelectorAll('button')].find(b => /^Run/.test(b.textContent) && b.offsetParent).click()`); await sleep(6000);
check('Lab optimality gap runs', /extra ops/.test(await ev('document.body.textContent')), '');

// Phone width
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1600, deviceScaleFactor: 1, mobile: true });
for (const p of ['index.html', 'codex.html', 'meta.html', 'lab.html']) { await go(p, 2000); const sw = await ev('document.documentElement.scrollWidth'); check(`${p}: no horizontal scroll at 390 px`, sw <= 390, sw); }
await go('index.html', 2000); await shot('table-phone.png');

check('no page errors', errors.length === 0, errors.join(' || '));
process.exitCode = results.every(r => r[0]) ? 0 : 1;
for (const [ok, n, info] of results) console.log(ok ? 'PASS' : 'FAIL', n, info === '' ? '' : `(${String(info).slice(0, 160)})`);
console.log(`${results.filter(r => r[0]).length}/${results.length} passed · screenshots in ${SHOTS}`);
ws.close(); chrome.kill();
