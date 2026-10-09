// Smoke test for the pages: drives them in headless Chromium over CDP. Needs the dev server
// (npm run dev) and chromium on PATH. Usage: node tools/ui-check.mjs [base-url]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runAdaptive } from '../js/core/meta-run.js';
import { generate, ranks } from '../js/core/input.js';
import { STACKS, SEED } from '../js/ui/stacks.js';
import { BUILDS } from '../js/cards/decks.js';
import { StackCache, bestPerStack, bestBuild } from '../js/core/stackcache.js';
import { byId, ALGOS } from '../js/cards/index.js';
import { stackRoute } from '../js/ui/stacks.js';
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
await go('index.html#deck=lsd-radix&n=100&gen=uniform&seed=1000');
check('LSD Radix from the hash: 1084', (await total()) === 1084, await ev(T('total')));
await ev(`${card('#techViewer .tcg.tech', 'Peephole Cancel')}.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`); await sleep(300);
check('Peephole Cancel trims radix and the delta strip says so', (await total()) < 1084 && /Peephole Cancel: −\d+ moves/.test(await ev(T('delta'))), await ev(T('delta')));
check('an old one-hand link fills every seat, and the hash follows the seat on the mat', /s=lsd-radix&m=lsd-radix&c=lsd-radix\+peephole-cancel&/.test(await ev('location.hash')), await ev('location.hash'));
await ev(`${card('#algoViewer .tcg.algo', 'Turk')}.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`); await sleep(500);
check('playing Turk keeps the post card', (await ev('location.hash')).includes('c=turk+peephole-cancel'), await ev('location.hash'));
check('Turk slots: native pick, default anchor and cost, Finisher', /Cheapest Pick/.test(await ev(T('slots'))) && /Keep Three/.test(await ev(T('slots'))) && /Hardcoded Three/.test(await ev(T('slots'))));
const turkOps = await total();
await ev(`${card('#techViewer .tcg.tech', 'Two-Way Cost')}.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`); await sleep(300);
check('swapping a default: Four-Way Cost → Two-Way Cost', /Four-Way Cost → Two-Way Cost/.test(await ev(T('delta'))), await ev(T('delta')));
check('an incompatible card is greyed with a reason', /no retrieval role/.test(await ev(`${card('#techViewer .tcg.tech', 'Max Retrieval')}.title`)));
await ev(`${card('#techViewer .tcg.tech', 'Two-Way Cost')}.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`); await sleep(300);
check('removing it restores the default', (await total()) === turkOps, `${await total()} vs ${turkOps}`);
check('the side tools are gone (Learn, Stats, Compare, Share)', !(await ev(`!!document.querySelector('#pin, #copyDeck, #ov-learn, #ov-stats, #compare, [data-open]')`)));
// The build: three seats and the tiny seat; every stack goes to one by size and disorder
check('the Table plays a build: four seats, and the one sorting this stack is lit', (await ev(`document.querySelectorAll('#buildbar .seat').length`)) === 4 && (await ev(`document.querySelector('#buildbar .seat.on')?.dataset.seat`)) === 'complex' && /sorting: Random 100/.test(await ev(T('buildbar'))));
check('Turk in --complex misses its class target; LSD Radix in --medium meets it', (await ev(`!!document.querySelector('#buildbar .seat[data-seat="complex"] .seattarget.bad') && !!document.querySelector('#buildbar .seat[data-seat="medium"] .seattarget.ok')`)));
await click('#stacks .brow[data-id="peak-100"]'); await sleep(500);
check('picking a stack puts its seat on the mat: Up then down goes to --medium', (await ev(`document.querySelector('#buildbar .seat.on')?.dataset.seat`)) === 'medium' && /Up then down.*--medium/.test(await ev(T('route'))), await ev(T('route')));
await click('#buildbar .seat[data-seat="simple"]'); await sleep(500);
check('picking a seat moves the board to one of its stacks', (await ev(`document.querySelector('#buildbar .seat.on')?.dataset.seat`)) === 'simple' && /--simple/.test(await ev(T('route'))), await ev(T('route')));
await click('#buildbar .seat[data-seat="tiny"]'); await sleep(500);
check('the tiny seat is built in: nothing to tune, no hand', (await ev(`!!document.querySelector('#slots .tinynote') && document.querySelectorAll('#hand .tcg').length === 0`)) && /tiny/.test(await ev(T('route'))));
await click('#buildbar .seat[data-seat="complex"]'); await sleep(500);
await click('#algoPile'); await sleep(200);
await click('#buildsView .buildbox[data-build="strong-build"]'); await sleep(600);
check('a named build fills all three seats', /s=lis-insertion\+four-way-cost\+rb-sink&m=bucket-insertion&c=four-end-quicksort\+pivot-by-leaf-count/.test(await ev('location.hash')), await ev('location.hash'));
const buildHash = await ev('location.hash');
await go('index.html' + buildHash, 2500);
check('a build survives a reload through its link', (await ev(`[...document.querySelectorAll('#buildbar .seat .seatname')].map(x => x.textContent).join()`)) === 'LIS Insertion,Bucket Insertion,Four-End Quicksort,Hardcoded Three · Oracle', await ev(`[...document.querySelectorAll('#buildbar .seat .seatname')].map(x => x.textContent).join()`));
// The stamps are --adaptive itself: the same moves as running the build outside the page.
const strong = BUILDS.find(b => b.id === 'strong-build');
const expected = Object.fromEntries(STACKS.map(b => [b.id, Math.max(...(b.seeds || [SEED]).map(s => runAdaptive(strong, ranks(generate(b.gen, b.n, s, b.param))).ops.length))]));
const shown = async () => ev(`Object.fromEntries([...document.querySelectorAll('#stacks .brow[data-id]')].map(r => [r.dataset.id, (t => t === '' ? null : +t)(r.querySelector('.bops').textContent.replace(/\\D/g, ''))]))`);
for (let i = 0; i < 60 && Object.values(await shown()).some(v => v == null); i++) await sleep(250);
const got = await shown(), off = STACKS.filter(b => got[b.id] !== expected[b.id]).map(b => `${b.id} ${got[b.id]} vs ${expected[b.id]}`);
check('every stack\'s stamp matches --adaptive run outside the page', !off.length, off.join('; '));
// The global seed: rolling it changes exactly the ten seeded stacks.
const SEEDED = STACKS.filter(b => ['uniform', 'nearly', 'disorder', 'local', 'nearrev'].includes(b.gen) && !b.seeds).map(b => b.id);
const before = await shown();
await set('#gseed', 1001); await sleep(300);
for (let i = 0; i < 60 && Object.values(await shown()).some(v => v == null); i++) await sleep(250);
const after = await shown(), moved = STACKS.filter(b => after[b.id] !== before[b.id]).map(b => b.id);
check('rolling the global seed changes only the ten seeded stacks', SEEDED.length === 10 && moved.every(id => SEEDED.includes(id)) && moved.length >= 5 && /gs=1001/.test(await ev('location.hash')), `${moved.length} moved: ${moved.join(', ')}`);
await set('#gseed', 1000); await sleep(300);
// Browse places cards: a seat can be filled from it alone, without the hand.
await click('#buildbar .seat[data-seat="medium"] .seatswap'); await sleep(300);
check('a seat\'s button opens the algorithm deck choosing for that seat', !(await ev(`document.getElementById('ov-algo').hidden`)) && /choosing for --medium/.test(await ev(T('algoTitle'))), await ev(T('algoTitle')));
await click('#algoViewer .tcg.algo[data-id="butterfly"]'); await sleep(300);
check('clicking a card shows it in the pane, with its fit for each flag', /Butterfly/.test(await ev(T('algoPane'))) && (await ev(`!!document.querySelector('#algoPane .fitrow .fit.ok')`)) && /Put in --medium/.test(await ev(T('algoPane'))));
await ev(`[...document.querySelectorAll('#algoPane button')].find(b => /Put in --medium/.test(b.textContent)).click()`); await sleep(800);
check('Put in --medium fills the seat and puts it on the mat', (await ev(`document.querySelector('#buildbar .seat.on')?.dataset.seat`)) === 'medium' && /Butterfly/.test(await ev(`document.querySelector('#buildbar .seat[data-seat="medium"] .seatname').textContent`)) && (await ev(`document.getElementById('ov-algo').hidden`)));
await click('#techPile'); await sleep(200);
await click('#techViewer .tcg.tech[data-id="second-max-lookahead"]'); await sleep(300);
await ev(`[...document.querySelectorAll('#techPane button')].find(b => /Play on --medium/.test(b.textContent))?.click()`); await sleep(500);
check('the technique pane plays a card on the seat on the mat', /Second-Max/.test(await ev(T('slots'))), (await ev(T('slots'))).slice(0, 120));
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(150);
// The cache and ☢: the shipped precompute and the browser's kept results; nothing is measured twice
const stampedAll = () => ev(`document.querySelectorAll('#stacks .mark.EXCELLENT, #stacks .mark.GOOD, #stacks .mark.PASS, #stacks .mark.FAIL').length`);
const settle = async () => { for (let i = 0; i < 80 && (await ev(`[...document.querySelectorAll('#stacks .mark')].some(m => m.textContent === '…')`)); i++) await sleep(250); };
await go('index.html', 3500);
check('a fresh load reads 100 % and stamps every stack without measuring anything', /100 %/.test(await ev(T('nuke'))) && (await ev('window.__runs || 0')) === 0 && (await stampedAll()) === STACKS.length, `${await ev(T('nuke'))} · runs ${await ev('window.__runs || 0')}`);
await ev(`${card('#techViewer .tcg.tech', 'Presorted Shortcut')}.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`); await sleep(400); await settle();
const ranOnce = await ev('window.__runs || 0'), keptHash = await ev('location.hash');
await sleep(800);   // the kept results are written in batches
await go('index.html' + keptHash, 3500); await settle();
check('a hand the precompute lacks is measured once, then a second visit runs nothing it already ran', ranOnce > 0 && (await ev('window.__runs || 0')) === 0 && (await stampedAll()) === STACKS.length, `first ${ranOnce} runs, then ${await ev('window.__runs || 0')}`);
const pct = async () => +(await ev(`document.querySelector('#nuke .npct').textContent`)).replace(/\D/g, '');
await set('#gseed', 4242); await sleep(1500);
const before4242 = await pct();
await click('#nuke'); await sleep(4000);
const during = await pct(), label = await ev(`document.querySelector('#nuke .ntext').textContent`);
await click('#nuke'); await sleep(300);
check('☢ fills another seed in the background and stops on a second click', before4242 < 100 && during > before4242 && label === 'STOP' && (await ev(`document.querySelector('#nuke .ntext').textContent`)) === 'PRECOMPUTE', `${before4242} % → ${during} %`);
// The cheats: a best-possible line, read from the cache, matching the same search outside the page
{
  const cache = new StackCache(); cache.ingest(JSON.parse(readFileSync(new URL('../data/stacks.json', import.meta.url))));
  const routes = Object.fromEntries(STACKS.map(b => [b.id, stackRoute(b, SEED)])), strong = BUILDS.find(b => b.id === 'strong-build');
  const ceil = bestPerStack(cache, SEED), bb = bestBuild(cache, SEED, routes, { simple: [strong.simple], medium: [strong.medium], complex: [strong.complex] });
  await go('index.html', 3500);
  await click('#cheatBuild'); await sleep(300);
  check('Cheat: best push_swap shows three seats that all meet their class target', !(await ev(`document.getElementById('cheatbar').hidden`)) && (await ev(`document.querySelectorAll('#cheatbar .cheatseat .seattarget.ok').length`)) === 3 && (await ev(`document.querySelectorAll('#stacks .brow.cheat').length`)) === STACKS.length, await ev(T('cheatbar')));
  const names = await ev(`[...document.querySelectorAll('#cheatbar .cheatseat .seatname')].map(x => x.textContent).join()`);
  check('its seats are the search\'s, run outside the page', names === ['simple', 'medium', 'complex'].map(k => byId[bb[k].hand.algo].name).join(), `${names} · ${['simple', 'medium', 'complex'].map(k => bb[k].hand.algo).join()}`);
  await click('#cheatStack'); await sleep(300);
  check('the cheats are one at a time: best card per stack unticks best push_swap', (await ev(`document.getElementById('cheatStack').checked && !document.getElementById('cheatBuild').checked && document.getElementById('cheatbar').hidden`)));
  const got = await shown(), off = STACKS.filter(b => got[b.id] !== ceil[b.id].ops).map(b => `${b.id} ${got[b.id]} vs ${ceil[b.id].ops}`);
  check('best card per stack: every row shows the search\'s fewest moves', !off.length, off.join('; '));
  check('…and how far the build is from it', (await ev(`[...document.querySelectorAll('#stacks .brow.cheat .bdelta.gap')].length`)) > 0);
  await click('#cheatBuild'); await sleep(300);
  await ev(`[...document.querySelectorAll('#cheatbar button')].find(b => b.textContent === 'Use this build').click()`); await sleep(800);
  const seats = await ev(`[...document.querySelectorAll('#buildbar .seat .seatname')].map(x => x.textContent).join()`), h = await ev('location.hash');
  check('Use this build copies the best push_swap into the seats, and the cheat goes off', (await ev(`!document.getElementById('cheatBuild').checked && document.getElementById('cheatbar').hidden`)) && ['simple', 'medium', 'complex'].every(k => h.includes(`${k[0]}=${bb[k].hand.algo}`)), `${seats} · ${h}`);
}
// Paths
await go('index.html#deck=simple-insertion&n=100&gen=uniform&seed=1000&path=insertion-ladder&step=0');   // as a Codex link opens it
check('Path: Insertion Ladder starts on Simple Insertion, in every seat', /Path: Insertion Ladder/.test(await ev(T('pathPanel'))) && (await ev('location.hash')).includes('s=simple-insertion&m=simple-insertion&c=simple-insertion&'), await ev('location.hash'));
await ev(`[...document.querySelectorAll('#pathPanel button')].find(b => b.textContent.includes('next step')).click()`); await sleep(600);
check('Path step 2 adds LIS Anchor', (await ev('location.hash')).includes('c=simple-insertion+lis-anchor'), await ev('location.hash'));
await ev(`[...document.querySelectorAll('#pathPanel button')].find(b => b.title === 'Leave the path').click()`);
// Manual input and validation
await set('#manual', '1 2 2'); await sleep(200);
check('manual: duplicate error', /appears twice/.test(await ev(T('inputError'))));
await set('#manual', '3 1 2'); await sleep(300);
check('manual values run', (await total()) > 0);
await set('#manual', '');
// Read the played card up close: plain words first, the technical part last
await ev(`document.querySelector('#played .tcg').click()`); await sleep(150);
const ib = await ev(T('inspectBody')), at = ['The idea', 'Step by step', 'Scorecard', 'Under the hood'].map(h => ib.indexOf(h));
check('clicking the played card opens it up close, the idea first', !(await ev(`document.getElementById('ov-inspect').hidden`)) && at.every((x, i) => x >= 0 && (!i || x > at[i - 1])), at.join(' '));
check('cards have no flip button', !(await ev(`!!document.querySelector('.tcg-btn.flip, .card .flip')`)));
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await shot('table.png');
// The card table: the hand, the slots, the blinds, the decks and Inspect
await go('index.html#deck=turk&n=100&gen=uniform&seed=1000', 2500);
const has = sel => ev(`!!document.querySelector(${JSON.stringify(sel)})`);
check('the hand holds the cards that fit', (await ev(`document.querySelectorAll('#hand .tcg.tech').length`)) >= 10, await ev(`document.querySelectorAll('#hand .tcg.tech').length`));
check('a built-in card says so: a lock tab, a seal and a ribbon', (await has('#slots .slot.native .tablock')) && (await has('#slots .slot.native .tcg .lockseal')) && (await has('#slots .slot.native .ribbon.native')));
await ev(`document.querySelector('#slots .slot.native .tcg').click()`); await sleep(100);
check('clicking it says why it stays', /built into Turk/.test(await ev(T('handInfo'))), await ev(T('handInfo')));
const endless = `document.getAnimations().filter(a => a.playState === 'running' && a.effect.getTiming().iterations === Infinity && !a.effect.target.closest('#played, .fx')).map(a => a.animationName)`;
check('only the card in focus plays endless effects', (await ev(endless + '.length')) === 0, await ev(endless + '.join()'));
await ev(`document.querySelector('#hand .tcg[data-id="lis-anchor"]').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))`); await sleep(200);
check('a technique up close shows its change here and on every card it fits', (await has('#inspectBody .dchips .dchip')) && (await has('#inspectBody .etable tr.here')));
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(150);
await click('#hand .tcg[data-id="lis-anchor"]'); await sleep(400);
check('a hand card goes to its slot and leaves the hand', /LIS Anchor/.test(await ev(T('slots'))) && !(await has('#hand .tcg[data-id="lis-anchor"]')));
check('the default it replaced comes back to the hand', await has('#hand .tcg[data-id="keep-three"]'));
await click('#slots .tcg[data-id="lis-anchor"]'); await sleep(400);
check('clicking a played card takes it back', (await has('#hand .tcg[data-id="lis-anchor"]')) && /Keep Three/.test(await ev(T('slots'))));
await click('#stacks .brow[data-id="random-500"]'); await sleep(900);
check('a stack on the left loads its input', (await ev(T('stackName'))) === 'Random 500' && (await ev(`document.getElementById('n').value`)) === '500', await ev(T('stackName')));
const stamped = () => ev(`document.querySelectorAll('#stacks .mark.EXCELLENT, #stacks .mark.GOOD, #stacks .mark.PASS, #stacks .mark.FAIL').length`);
for (let i = 0; i < 40 && (await stamped()) < STACKS.length; i++) await sleep(250);
check('every stack gets stamped in the background', (await stamped()) === STACKS.length, await ev(`document.querySelectorAll('#stacks .mark').length`));
check('there is no slot-limit switch: the Table is a sandbox', !(await has('#sandbox')));
check('hand cards show their measured change in the corner', (await ev(`document.querySelectorAll('#hand .tcg .fxbadge').length`)) >= 5);
check('a card that needs another says so: Lookahead-k needs a Pick', /needs a Pick: Cheapest Pick/.test(await ev(`document.querySelector('#hand .tcg[data-id="lookahead-k"] .needs')?.textContent || ''`)));
await click('#hand .tcg[data-id="lis-anchor"]'); await sleep(3500);
check('after a change, every stack shows what it did', (await ev(`document.querySelectorAll('#stacks .bdelta.good, #stacks .bdelta.bad').length`)) >= 3 && /better|worse/.test(await ev(T('stackSum'))), await ev(T('stackSum')));
await click('#algoPile'); await sleep(200);
check('the algorithm deck spreads out', !(await ev(`document.getElementById('ov-algo').hidden`)) && (await ev(`document.querySelectorAll('#algoViewer .tcg.algo').length`)) === ALGOS.length);
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(150);
check('Escape closes it', await ev(`document.getElementById('ov-algo').hidden`));
check('the decks sit beside the hand, with no Draw, no book and no right column', (await has('.handzone .deckdock #algoPile')) && (await has('.handzone .deckdock #techPile')) && !(await ev(`!!document.querySelector('.rightpanel, #algoDraw, #techDraw, .book')`)));
await click('#techPile'); await sleep(200);
check('the technique deck spreads out too', !(await ev(`document.getElementById('ov-tech').hidden`)));
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(150);
await click('#hand .tcg .peek'); await sleep(250);
check('Inspect shows a card up close', !(await ev(`document.getElementById('ov-inspect').hidden`)) && /Codex page/.test(await ev(T('inspectBody'))) && /The idea/.test(await ev(T('inspectBody'))));
await shot('table-inspect.png');
// The cards' design: covers, badges, icons, tooltips; the fire past 10; the log and the effects
check('every stack shows its route: disorder, flag and card', (await ev(`document.querySelectorAll('#stacks .brow .route').length`)) === STACKS.length && (await has('#stacks .brow[data-id="random-100"] .route.f-complex')) && (await has('#stacks .brow[data-id="peak-100"] .route.f-medium')) && (await has('#stacks .brow[data-id="five"] .route.f-tiny')));
check('lesson cards wear a book in the type line, and no card wears a research flask', (await ev(`[...document.querySelectorAll('#algoViewer .tcg.algo')].filter(c => c.querySelector('.tcg-type .tmark')).map(c => c.dataset.id).sort().join()`)) === 'lookahead-greedy,natural-merge' && !(await ev(`!!document.querySelector('.tmark.research')`)) && !(await ev(`!!document.querySelector('.ribbon.exp, .ribbon.lesson')`)), await ev(`[...document.querySelectorAll('#algoViewer .tcg-type .tmark')].length`));
check('every algorithm card has its own cover', (await ev(`new Set([...document.querySelectorAll('#algoViewer .tcg.algo svg.cover')].map(s => s.innerHTML)).size`)) === ALGOS.length, await ev(`document.querySelectorAll('#algoViewer svg.cover').length`));
check('the played card shows class, slot tier and push_swap tier', (await ev(`[...document.querySelectorAll('#played .badges .badge small')].map(b => b.textContent).join()`)) === 'class,slots,push_swap', await ev(`[...document.querySelectorAll('#played .badges .badge small')].map(b => b.textContent).join()`));
check('Grasp and Craft carry a bulb and a hammer', (await ev(`document.querySelectorAll('#played .gem svg').length`)) === 2);
check('tooltips are the themed kind', await has('body > .tip'));
check('the move log lists the moves', (await ev(`document.querySelectorAll('#movelog .logrow').length`)) >= 1);
await go('index.html#s=lis-insertion+four-way-cost+rb-sink&m=bucket-insertion&c=four-end-quicksort+dp-splits+bfs-leaf+peephole-cancel+peephole-fuse&n=100&gen=uniform&seed=1000', 2500);
check('a build past its fire lines burns', (await ev(`document.querySelectorAll('.manarow.onfire .flames i').length`)) === 18, await ev(T('mana')));
await go('index.html#s=min-extract&m=chunks&c=lsd-radix&n=100&gen=uniform&seed=1000', 2500);
check('a classic radix build does not', (await ev(`document.querySelectorAll('.manarow.onfire').length`)) === 0 && /Grasp\s*9[^0-9]/.test(await ev(T('mana'))), await ev(T('mana')));
// The playback console: the speed dial (type, scroll, auto), the keyboard, the timeline
await go('index.html#deck=turk&n=100&gen=uniform&seed=1000', 2500);
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
const body = await ev('document.body.textContent');
check('Codex card page', ['The idea', 'Step by step', 'Under the hood', 'Lore'].every(h => body.includes(h)), body.length);
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
