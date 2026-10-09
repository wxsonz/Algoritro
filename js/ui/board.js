// The board: stacks A and B as bars on a canvas, with a playback console under it.
//   The timeline is the scrubber: its colours are the phases; drag it, click it, scroll on it.
//   The keys play, step and skip a phase (Space, ←/→, Shift+←/→, Home/End also work).
//   Speed is in moves per second: scroll, drag or type into the dial (2, 250, 1.5k); "auto" fits
//   the whole run into a few seconds. Below 25 moves a second every move is animated.
// Several boards can step together (Compare): a follower board has no console of its own, and
// the lead board's console can sit in a dock under both boards.
// While it plays the board shows off (FX, which can be switched off): a banner for each new
// phase, a combo counter for streaks of the same move, sparks where moves land, and a finale.
// A move log beside the board lists the moves up to the current one (LOG).
import { el, css, store } from './common.js';
import { icon } from './pixel.js';
import { Machine } from '../core/machine.js';
import { grade } from '../core/metrics.js';

const CHECK = 256;           // states are rebuilt from a checkpoint every 256 steps
const LOC = ['top of A', 'bottom of A', 'top of B', 'bottom of B'];
const SPEEDS = [0.5, 1, 2, 3, 5, 8, 12, 20, 30, 50, 80, 120, 200, 300, 500, 800, 1200, 2000, 3000, 5000, 8000, 12000, 20000, 30000, 50000, 100000];
const MIN = 0.25, MAX = 200000, AUTO_SECONDS = 6, TWEEN = 25;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const autoSpeed = total => clamp(total / AUTO_SECONDS, 1.5, MAX);
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// One wheel notch is one step; a trackpad's small deltas add up to one.
function wheeler(f) {
  let acc = 0;
  return e => {
    const d = (e.deltaY || e.deltaX) * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 400 : 1);
    if (Math.abs(d) >= 50) { acc = 0; f(Math.sign(d), e); return; }
    acc += d; if (Math.abs(acc) >= 60) { f(Math.sign(acc), e); acc = 0; }
  };
}
export const opKind = op => /^p/.test(op) ? 'push' : /^rr[abr]$/.test(op) ? 'rrot' : /^r/.test(op) ? 'rot' : 'swap';
export const fmtSpeed = v => v >= 1000 ? `${+(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : v >= 10 ? String(Math.round(v)) : String(+v.toFixed(2));
// "250", "1.5k", "2/s", "300 moves" → moves per second.
export function parseSpeed(s) { const m = String(s).trim().toLowerCase().match(/^(\d*\.?\d+)\s*(k)?/); return m ? +m[1] * (m[2] ? 1000 : 1) : NaN; }
function applyOp(a0, b0, o) {
  const a = a0.slice(), b = b0.slice();
  const sw = s => { if (s.length > 1) [s[0], s[1]] = [s[1], s[0]]; }, ro = s => { if (s.length > 1) s.push(s.shift()); }, rr = s => { if (s.length > 1) s.unshift(s.pop()); };
  if (o === 'pa' && b.length) a.unshift(b.shift()); else if (o === 'pb' && a.length) b.unshift(a.shift());
  if (o === 'sa' || o === 'ss') sw(a); if (o === 'sb' || o === 'ss') sw(b);
  if (o === 'ra' || o === 'rr') ro(a); if (o === 'rb' || o === 'rr') ro(b);
  if (o === 'rra' || o === 'rrr') rr(a); if (o === 'rrb' || o === 'rrr') rr(b);
  return [a, b];
}
const place = (A, B) => { const m = new Map(); A.forEach((v, i) => m.set(v, [0, i])); B.forEach((v, i) => m.set(v, [1, i])); return m; };
const fam = p => (p || '').replace(/\s*[\d[].*$/, '') || p;   // "chunk 3/5" and "chunk 4/5" share a colour

export class Board {
  constructor(root, { follower = false, dock = null, log = null, onStep } = {}) {
    Object.assign(this, { root, onStep, follower, ranks: [], result: null, step: 0, frac: 0, pos: 0, playing: false, peers: [], checkpoints: [], names: [] });
    this.fx = store.get('board:fx') !== 'off';
    this.logBox = log; this.logOn = store.get('board:log') !== 'off';
    const saved = store.get('board:speed');
    this.auto = !saved || saved === 'auto';
    this.speed = this.auto ? 50 : clamp(+saved || 50, MIN, MAX);
    this.canvas = el('canvas.board', { width: 900, height: 420, 'aria-label': 'Stacks A and B' });
    this.segs = el('span.tl-segs'); this.rest = el('span.tl-rest'); this.head = el('span.tl-head'); this.tip = el('span.tl-tip');
    this.timeline = el('div.timeline', { role: 'slider', tabIndex: 0, 'aria-label': 'Playback position: drag, click, scroll or use the arrow keys', 'aria-valuemin': 0, 'aria-valuemax': 0, 'aria-valuenow': 0 },
      this.segs, this.rest, this.head, this.tip);
    this.stepNo = el('b.stepno'); this.stepOp = el('code.optoken'); this.stepPhase = el('span.phase'); this.stepWhy = el('span.why');
    const info = el('p.stepinfo', {}, this.stepNo, this.stepOp, this.stepPhase, this.stepWhy);
    this.bindTimeline();
    if (follower) root.append(this.canvas, this.timeline, el('div.console.follow', {}, info));   // floats over its canvas
    else {
      const key = (name, label, hint, f, cls = '') => el('button', { className: 'key' + cls, title: `${label} (${hint})`, 'aria-label': label, onclick: f, html: icon(name) });
      this.playBtn = key('play', 'Play', 'Space', () => this.toggle(), ' play');
      const keys = el('div.keys', {},
        key('first', 'First', 'Home', () => this.seek(0)),
        key('stepb', 'Previous move', '←', () => this.stepBy(-1)),
        this.playBtn,
        key('stepf', 'Next move', '→', () => this.stepBy(1)),
        key('skip', 'Next phase', 'Shift →', () => this.nextPhase()),
        key('last', 'Last', 'End', () => this.seek(this.endStep())));
      this.fxLayer = el('div.fxlayer', { 'aria-hidden': 'true' });
      root.append(this.canvas, this.timeline, this.fxLayer);
      this.fxBtn = el('button.toggle-pill', { title: 'Effects while it plays: phase banners, combos, sparks and a finale', onclick: () => this.setFx(!this.fx) }, 'FX');
      this.logBtn = log ? el('button.toggle-pill', { title: 'The move log beside the board', onclick: () => this.setLog(!this.logOn) }, 'LOG') : '';
      (dock || root).append(el('div.console', {}, keys, info, this.dial(), el('div.pills', {}, this.fxBtn, this.logBtn)));
      this.setFx(this.fx, false); if (log) this.setLog(this.logOn, false);
      this.bindKeys();
      this.showSpeed();
    }
    new ResizeObserver(() => this.render()).observe(this.canvas);
  }
  get total() { return this.result ? this.result.ops.length : 0; }
  endStep() { return Math.max(this.total, ...this.peers.map(p => p.total)); }
  lead() { return this.follower ? this.peers.find(p => !p.follower) || this : this; }

  // ---- the speed dial ----------------------------------------------------------------------
  dial() {
    this.speedIn = el('input.speedval', { type: 'text', inputMode: 'decimal', spellcheck: false, 'aria-label': 'Speed in moves per second' });
    this.autoBtn = el('button.auto', { title: `Fit the whole run into about ${AUTO_SECONDS} seconds`, onclick: () => this.setAuto() }, 'auto');
    const nudge = (d, label) => el('button.nudge', { 'aria-label': label, title: `${label} ( ${d > 0 ? ']' : '['} )`, onclick: () => this.nudge(d) }, d > 0 ? '›' : '‹');
    const box = el('div.speed', { title: 'Speed in moves per second: scroll or drag up and down, or click the number and type' },
      el('span.slabel', {}, 'speed'), nudge(-1, 'Slower'), this.speedIn, el('span.unit', {}, '/s'), nudge(1, 'Faster'), this.autoBtn);
    // Type a number: Enter or leaving the field applies it, Escape keeps the old one.
    const commit = () => { const v = parseSpeed(this.speedIn.value); if (v > 0 && Math.abs(v - this.speed) > 1e-9) this.setSpeed(v); };
    this.speedIn.onfocus = () => this.speedIn.select();
    this.speedIn.onblur = () => { if (!this.cancelEdit) commit(); this.showSpeed(); };
    this.speedIn.onkeydown = e => {
      e.stopPropagation();
      if (e.key === 'Enter') { commit(); this.speedIn.blur(); }
      else if (e.key === 'Escape') { this.cancelEdit = true; this.speedIn.blur(); this.cancelEdit = false; this.speedIn.value = fmtSpeed(this.speed); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this.nudge(e.key === 'ArrowUp' ? 1 : -1); this.speedIn.select(); }
    };
    // Scroll on the dial: up is faster, one notch per step of the scale.
    const spin = wheeler(d => this.nudge(-d));
    box.addEventListener('wheel', e => { e.preventDefault(); spin(e); }, { passive: false });
    // Drag up and down on the dial, like a knob: every 30 px doubles or halves the speed.
    box.addEventListener('pointerdown', e => {
      if (e.target.closest('button, input') || e.button !== 0) return;
      const y0 = e.clientY, v0 = this.speed; let moved = false;
      box.setPointerCapture(e.pointerId); box.classList.add('turning');
      box.onpointermove = m => { if (Math.abs(m.clientY - y0) > 2) moved = true; if (moved) this.setSpeed(+(v0 * 2 ** ((y0 - m.clientY) / 30)).toPrecision(2)); };
      box.onpointerup = () => { box.onpointermove = box.onpointerup = null; box.classList.remove('turning'); if (!moved) this.speedIn.focus(); };
    });
    return box;
  }
  nudge(d) {
    const v = this.speed, i = d > 0 ? SPEEDS.findIndex(s => s > v * 1.001) : SPEEDS.findLastIndex(s => s < v / 1.001);
    this.setSpeed(i >= 0 ? SPEEDS[i] : d > 0 ? MAX : MIN);
  }
  setSpeed(v) {
    this.speed = clamp(v, MIN, MAX); this.auto = false;
    store.set('board:speed', String(this.speed));
    this.showSpeed();
  }
  setAuto() {
    this.auto = true; this.speed = autoSpeed(this.total);
    store.set('board:speed', 'auto');
    this.showSpeed();
  }
  showSpeed() {
    if (!this.speedIn) return;
    if (document.activeElement !== this.speedIn) this.speedIn.value = fmtSpeed(this.speed);
    this.autoBtn.classList.toggle('on', this.auto);
    this.autoBtn.setAttribute('aria-pressed', this.auto ? 'true' : 'false');
    const secs = this.total / this.speed;
    this.speedIn.title = this.total ? `The whole run takes ${secs < 1 ? 'under a second' : secs < 90 ? `${Math.round(secs)} s` : `${Math.round(secs / 60)} min`} at this speed` : '';
  }

  // ---- the timeline: phases, scrubber, playhead -----------------------------------------------
  bindTimeline() {
    const t = this.timeline, at = e => { const r = t.getBoundingClientRect(); return clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1); };
    const stepAt = x => Math.round(x * this.total);
    t.addEventListener('pointerdown', e => { if (!this.total || e.button !== 0) return; t.setPointerCapture(e.pointerId); this.dragging = true; t.classList.add('dragging'); this.seek(stepAt(at(e))); });
    t.addEventListener('pointermove', e => { const x = at(e), k = stepAt(x); this.showTip(x, k); if (this.dragging) this.seek(k); });
    const end = () => { this.dragging = false; t.classList.remove('dragging'); };
    t.addEventListener('pointerup', end); t.addEventListener('pointercancel', end);
    const roll = wheeler((d, e) => this.seek(this.step + d * (e.shiftKey ? 10 : 1)));
    t.addEventListener('wheel', e => { if (!this.total) return; e.preventDefault(); roll(e); }, { passive: false });
    t.addEventListener('keydown', e => {
      const big = Math.max(1, Math.ceil(this.total / 10));
      const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: big, PageDown: -big }[e.key];
      if (k) this.seek(this.step + k);
      else if (e.key === 'Home' || e.key === 'End') this.seek(e.key === 'Home' ? 0 : this.endStep());
      else return;
      e.preventDefault(); e.stopPropagation();
    });
  }
  showTip(x, k) {
    const st = this.result?.steps?.[Math.max(0, k - 1)];
    this.tip.textContent = k ? `${k} · ${st?.phase || this.result?.ops?.[k - 1] || ''}` : 'start';
    this.tip.style.left = `${(x * 100).toFixed(2)}%`;
  }
  drawTimeline() {
    const t = this.segs; t.replaceChildren();
    const st = this.result?.steps;
    if (!st?.length) { this.names = []; if (this.total) t.append(el('span', { style: { flex: 1, background: 'var(--b-grey, #5e6e74)' } })); return; }
    const segs = []; for (let i = 0; i < st.length; i++) { const p = st[i].phase; if (!segs.length || segs[segs.length - 1].p !== p) segs.push({ p, len: 0 }); segs[segs.length - 1].len++; }
    this.names = [...new Set(segs.map(s => fam(s.p)))];
    if (segs.length > 400) {   // too many segments to draw one by one: merge by family
      const merged = []; for (const s of segs) { const f = fam(s.p); if (merged.length && merged[merged.length - 1].f === f) merged[merged.length - 1].len += s.len; else merged.push({ ...s, f }); }
      segs.splice(0, segs.length, ...merged);
    }
    segs.forEach((s, k) => t.append(el('span', { style: { flex: s.len, background: this.colorOf(s.p, 46 + (k % 2) * 10) } })));
  }
  colorOf(p, light = 46) { const i = this.names.indexOf(fam(p)); return i < 0 ? '#5e6e74' : `hsl(${(i * 67 + 200) % 360} 55% ${light}%)`; }

  // ---- playback ---------------------------------------------------------------------------------
  load(ranks, result) {
    if (this.anim) { cancelAnimationFrame(this.anim); this.anim = 0; }
    this.ranks = ranks; this.result = result; this.stop();
    this.checkpoints = [];
    if (result) {
      const m = new Machine(ranks, { lean: true }); this.checkpoints.push([m.a.slice(), m.b.slice()]);
      result.ops.forEach((o, i) => { m.op(o); if ((i + 1) % CHECK === 0) this.checkpoints.push([m.a.slice(), m.b.slice()]); });
    }
    if (this.auto) this.speed = autoSpeed(this.total);
    this.showSpeed(); this.drawTimeline(); this.go(0);
  }
  stateAt(i) {
    if (!this.result) return [this.ranks, []];
    const c = Math.min(Math.floor(i / CHECK), this.checkpoints.length - 1), [a, b] = this.checkpoints[c], m = new Machine(a, { lean: true }); m.b = b.slice();
    for (let k = c * CHECK; k < i; k++) m.op(this.result.ops[k]);
    return [m.a, m.b];
  }
  seek(i) { this.settle(); this.goAll(clamp(Math.round(i), 0, this.endStep())); }
  // Finish a running one-move animation at once (a second key press, play, seek or a new run).
  settle() { if (!this.anim) return; cancelAnimationFrame(this.anim); this.anim = 0; this.goAll(this.animTo); }
  // One move forward or back, animated when the bars are big enough to follow.
  stepBy(d) {
    this.settle();
    const to = clamp(this.step + d, 0, this.endStep());
    if (this.playing || calm() || this.ranks.length > 120 || to === this.step) return this.seek(to);
    const base = Math.min(to, this.step), t0 = performance.now(), dur = 220;
    this.animTo = to;
    const f = now => { const k = Math.min(1, (now - t0) / dur); if (k < 1) { this.goAll(base, d > 0 ? k : 1 - k); this.anim = requestAnimationFrame(f); } else { this.anim = 0; this.goAll(to); } };
    this.anim = requestAnimationFrame(f);
  }
  goAll(i, f = 0, fromTick = false) { this.go(i, f, fromTick); for (const p of this.peers) p.go(i, f, fromTick); }
  go(i, f = 0, fromTick = false) {
    const prev = this.step;
    this.step = clamp(Math.round(i), 0, this.total);
    this.frac = this.step < this.total ? f : 0;
    if (!fromTick) this.pos = Math.max(this.step, Math.min(i, this.endStep()));
    const p = this.total ? (this.step + this.frac) / this.total : 0, pc = `${(p * 100).toFixed(3)}%`;
    this.rest.style.left = pc; this.head.style.left = pc;
    this.timeline.setAttribute('aria-valuemax', this.total); this.timeline.setAttribute('aria-valuenow', this.step);
    this.stepNo.textContent = `${this.step} / ${this.total}`;
    const k = this.frac ? this.step : this.step - 1, st = this.result?.steps?.[k], op = k >= 0 ? this.result?.ops?.[k] : '';
    this.stepOp.textContent = op || ''; this.stepOp.className = 'optoken' + (op ? ' ' + opKind(op) : '');
    const ph = st?.phase || '';
    this.stepPhase.textContent = ph; this.stepPhase.hidden = !ph; this.stepPhase.style.setProperty('--pc', this.colorOf(ph, 42));
    this.stepWhy.textContent = st?.why || (this.step === 0 && this.result ? 'the input, before any move' : this.step >= this.total && this.result ? (this.result.valid ? 'done: sorted' : '') : '');
    this.render(); this.renderLog(); this.juiceStep(prev, fromTick); this.onStep?.(this.step);
  }
  toggle() {
    const lead = this.lead(); if (lead !== this) return lead.toggle();
    if (this.playing) return this.stop(true);
    this.settle();
    if (!this.endStep()) return;
    if (this.step >= this.endStep()) this.goAll(0);
    if (this.step === 0 && this.juicy) this.pop('banner go', 'SORT!', { life: 950 });
    this.playing = true; this.pos = this.step + this.frac; this.last = performance.now(); this.updatePlay();
    this.raf = requestAnimationFrame(t => this.tick(t));
  }
  // Stop; when paused halfway through an animated move, land on the nearer whole move.
  stop(land = false) {
    const was = this.playing; this.playing = false; cancelAnimationFrame(this.raf); this.updatePlay();
    if (was && land && this.frac) this.goAll(this.frac > .5 ? this.step + 1 : this.step);
  }
  tick(now) {
    if (!this.playing) return;
    const dt = clamp((now - this.last) / 1000, 0, .1), end = this.endStep(); this.last = now;
    this.pos = Math.min(end, this.pos + this.speed * dt);
    if (this.pos >= end) { this.stop(); this.goAll(end, 0, true); this.finale(); return; }
    const i = Math.floor(this.pos);
    this.goAll(i, this.speed <= TWEEN && !calm() ? this.pos - i : 0, true);
    this.raf = requestAnimationFrame(t => this.tick(t));
  }
  updatePlay() {
    if (!this.playBtn) return;
    this.playBtn.innerHTML = icon(this.playing ? 'pause' : 'play');
    this.playBtn.classList.toggle('on', this.playing);
    this.playBtn.setAttribute('aria-label', this.playing ? 'Pause' : 'Play'); this.playBtn.title = `${this.playing ? 'Pause' : 'Play'} (Space)`;
  }
  nextPhase() {
    const st = this.result?.steps ?? []; const cur = st[this.step]?.phase ?? st[this.step - 1]?.phase;
    let i = this.step; while (i < st.length && st[i].phase === cur) i++;
    this.seek(Math.min(i + 1, this.endStep()));
  }
  prevPhase() {
    const st = this.result?.steps ?? [], start = k => { while (k > 0 && st[k - 1].phase === st[k].phase) k--; return k; };
    const k = Math.min(this.step, st.length) - 1; if (k < 0) return this.seek(0);
    const a = start(k); if (this.step > a + 1) return this.seek(a + 1);
    this.seek(a - 1 < 0 ? 0 : start(a - 1) + 1);
  }
  // Keyboard: Space, ←/→, Shift+←/→ for phases, Home/End, [ and ] for speed. Not while typing
  // or while an overlay is open.
  bindKeys() {
    document.addEventListener('keydown', e => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || !this.canvas.isConnected) return;
      const t = e.target;
      if (t.closest?.('input, select, textarea, [contenteditable="true"], .overlay:not([hidden])')) return;
      if (e.key === ' ' && t.closest?.('button, a, [role="slider"]')) return;
      const act = {
        ' ': () => this.toggle(), Home: () => this.seek(0), End: () => this.seek(this.endStep()), ']': () => this.nudge(1), '[': () => this.nudge(-1),
        ArrowRight: () => e.shiftKey ? this.nextPhase() : this.stepBy(1), ArrowLeft: () => e.shiftKey ? this.prevPhase() : this.stepBy(-1),
      }[e.key];
      if (!act) return;
      e.preventDefault(); act();
    });
  }

  // ---- the move log ----------------------------------------------------------------------------
  setLog(on, save = true) {
    this.logOn = on; if (save) store.set('board:log', on ? 'on' : 'off');
    this.logBtn?.classList.toggle('on', on); this.logBtn?.setAttribute('aria-pressed', on ? 'true' : 'false');
    this.logBox.hidden = !on; this.logBox.closest('.boardplate')?.classList.toggle('withlog', on);
    this.renderLog(); requestAnimationFrame(() => this.render());
  }
  // The moves up to the current one, newest at the bottom, with a header at each new phase.
  renderLog() {
    const box = this.logBox; if (!box || !this.logOn) return;
    const ops = this.result?.ops, st = this.result?.steps;
    if (!ops) { box.replaceChildren(el('p.logempty', {}, 'Play a hand: its moves show up here.')); return; }
    const rows = Math.max(4, Math.floor((box.clientHeight || 300) / 22)), end = this.step + (this.frac ? 1 : 0), start = Math.max(0, end - rows);
    const out = [];
    let last = start > 0 ? st?.[start - 1]?.phase : undefined;
    for (let k = start; k < end; k++) {
      const s = st?.[k], ph = s?.phase;
      if (ph && ph !== last) { out.push(el('div.logphase', { style: { '--pc': this.colorOf(ph, 42) } }, ph)); last = ph; }
      out.push(el('div', { className: 'logrow' + (k === end - 1 ? ' now' : '') }, el('span.lk', {}, k + 1), el('code', { className: 'optoken ' + opKind(ops[k]) }, ops[k]), el('span.lw', {}, s?.why || '')));
    }
    if (!end) out.push(el('div.logrow.now', {}, el('span.lw', {}, 'the input, before any move')));
    if (this.result && this.step >= this.total && this.total) out.push(el('div', { className: 'logend' + (this.result.valid ? '' : ' bad') }, this.result.valid ? `sorted in ${this.total} moves` : 'not sorted'));
    box.replaceChildren(...out.slice(-(rows + 1)));
  }

  // ---- juice while it plays: banners, combos, sparks, milestones and a finale ---------------------
  get juicy() { return this.fx && !this.follower && !calm(); }
  setFx(on, save = true) {
    this.fx = on; if (save) store.set('board:fx', on ? 'on' : 'off');
    this.fxBtn?.classList.toggle('on', on); this.fxBtn?.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!on) { this.hideCombo(); this.fxLayer?.replaceChildren(); }
  }
  pop(cls, text, { life = 1100, style = {} } = {}) {
    const n = el('div', { className: 'fx ' + cls, style }, text);
    this.fxLayer.append(n); setTimeout(() => n.remove(), life);
    return n;
  }
  jolt(cls = 'jolt') { this.root.classList.remove('jolt', 'quake'); void this.root.offsetWidth; this.root.classList.add(cls); }
  juiceStep(prev, fromTick) {
    const ops = this.result?.ops, k = this.step - 1, ph = k >= 0 ? this.result?.steps?.[k]?.phase : undefined;
    if (!ops || !this.juicy || !fromTick || this.step <= prev) { this.lastPhase = ph; if (!fromTick) this.hideCombo(); return; }
    const now = performance.now();
    // A new phase: a banner slams across the board.
    if (ph && this.lastPhase !== undefined && ph !== this.lastPhase && this.speed <= 600 && now - (this.lastBanner || 0) > 900) {
      this.lastBanner = now;
      this.pop('banner', `${ph}!`, { life: 1000, style: { '--pc': this.colorOf(ph, 44) } }); this.jolt();
    }
    this.lastPhase = ph;
    // A streak of the same move: a combo counter that grows, and catches fire.
    if (this.speed <= 400) { let n = 0; for (let j = k; j >= 0 && ops[j] === ops[k] && n < 999; j--) n++; if (n >= 4) this.showCombo(ops[k], n); else this.hideCombo(); }
    else this.hideCombo();
    // Every hundred moves: a milestone.
    if (Math.floor(this.step / 100) > Math.floor(prev / 100) && this.speed <= 2500) this.pop('milestone', `${Math.floor(this.step / 100) * 100}!`, { life: 900 });
    // Slow enough to follow: sparks where the move landed.
    if (this.speed <= TWEEN) this.sparks(k);
  }
  showCombo(op, n) {
    if (!this.comboEl) { this.comboEl = el('div'); this.fxLayer.append(this.comboEl); }
    this.comboEl.className = `fx combo ${opKind(op)}${n >= 12 ? ' blaze' : ''}`;
    this.comboEl.style.setProperty('--n', Math.min(n, 40));
    this.comboEl.replaceChildren(el('code', {}, op), el('b', {}, `×${n}`), el('small', {}, n >= 12 ? 'combo!!' : 'combo'));
  }
  hideCombo() { this.comboEl?.remove(); this.comboEl = null; }
  sparks(k) {
    const g = this.geo, [A, B] = this.stateAt(this.step); if (!g) return;
    const mover = this.result.steps?.[k]?.focus?.mover, op = this.result.ops[k];
    let side = /b$/.test(op) || op === 'pb' ? 1 : 0, idx = 0;
    if (mover != null && (A.includes(mover) || B.includes(mover))) { side = A.includes(mover) ? 0 : 1; idx = (side ? B : A).indexOf(mover); }
    else if (/^r[ab]$/.test(op)) idx = (side ? B : A).length - 1;
    const v = (side ? B : A)[idx]; if (v == null) return;
    const x = side * g.half + 8 + 8 + (g.half - 26) * (v + 1) / g.n, y = g.top + idx * g.rowH + g.rowH / 2;
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 22;
      const sp = el('i', { className: 'fx spark', style: { left: `${x}px`, top: `${y}px`, color: `hsl(${(v / g.n) * 270 + 200} 95% 66%)`, '--dx': `${(Math.cos(a) * d).toFixed(1)}px`, '--dy': `${(Math.sin(a) * d).toFixed(1)}px` } });
      this.fxLayer.append(sp); setTimeout(() => sp.remove(), 650);
    }
  }
  finale() {
    if (!this.juicy || !this.result) return;
    this.hideCombo();
    for (const b of this.fxLayer.querySelectorAll('.banner, .milestone')) b.remove();   // the finale has the stage
    const ok = this.result.valid, g = this.total ? grade(this.ranks.length, this.total).replace('~', '') : 'EXCELLENT';
    const word = !ok ? 'NOT SORTED' : this.total === 0 ? 'ALREADY SORTED!' : g === 'EXCELLENT' ? 'EXCELLENT!' : 'SORTED!';
    this.pop('finale ' + (!ok ? 'bad' : g === 'EXCELLENT' ? 'gold' : 'ok'), word, { life: 2300 });
    this.jolt('quake');
    if (!ok) return;
    const colours = g === 'EXCELLENT' ? ['#ffd45a', '#fff1b0', '#f2b705', '#ffffff', '#ffb347'] : ['#ff6b6b', '#ffd93d', '#6bff95', '#5ad1ff', '#c77dff'];
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    for (let i = 0; i < 80; i++) {
      const c = el('i', { className: 'fx confetti', style: { left: `${(Math.random() * w).toFixed(0)}px`, background: colours[i % colours.length],
        '--dx': `${((Math.random() - .5) * 160).toFixed(0)}px`, '--fall': `${(h + 40).toFixed(0)}px`, '--r': `${((Math.random() - .5) * 1440).toFixed(0)}deg`,
        '--t': `${(1.2 + Math.random() * 1.3).toFixed(2)}s`, '--d': `${(Math.random() * .35).toFixed(2)}s` } });
      this.fxLayer.append(c); setTimeout(() => c.remove(), 3200);
    }
  }

  // ---- drawing ---------------------------------------------------------------------------------
  render() {
    const cv = this.canvas, dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const n = Math.max(1, this.ranks.length), half = w / 2, top = 28, rowH = (h - top - 6) / n;
    this.geo = { n, half, top, rowH };
    const tween = this.frac > 0 && !!this.result && this.step < this.total;
    const [A, B] = this.stateAt(this.step);
    const k = tween ? this.step : this.step - 1, op = k >= 0 ? this.result?.ops?.[k] || '' : '', st = k >= 0 ? this.result?.steps?.[k] : null;
    const ov = st?.ov, focus = st?.focus;
    const muted = css('--muted'), ink = css('--ink'), dark = css('--bg').startsWith('#1'), font = css('--pixel') || 'system-ui, sans-serif';
    g.textBaseline = 'alphabetic';
    g.fillStyle = muted; g.font = `19px ${font}`;
    g.fillText(`A · ${A.length}`, 8, 20); g.fillText(`B · ${B.length}`, half + 8, 20);
    // The overlay's label.
    let label = '';
    if (ov?.kind === 'bit') label = typeof ov.data === 'number' ? `bit ${ov.data}` : ov.data;
    else if (ov?.kind === 'range') label = `ranks [${ov.data[0]}, ${ov.data[1]})`;
    else if (ov?.kind === 'keep') label = `kept: ${ov.data.size}`;
    else if (ov?.kind === 'partition') label = `chunk [${ov.data.lo}, ${ov.data.hi}) at the ${LOC[ov.data.loc]}`;
    if (label) { g.fillStyle = css('--accent'); const tw = g.measureText(label).width; g.fillText(label, half - tw - 8, 20); }
    g.strokeStyle = css('--line'); g.lineWidth = 1; g.beginPath(); g.moveTo(half, 0); g.lineTo(half, h); g.stroke();
    const touchA = !tween && /a$|^(ss|rr|rrr|pa|pb)$/.test(op), touchB = !tween && /b$|^(ss|rr|rrr|pa|pb)$/.test(op);
    const inOv = v => !ov ? true : ov.kind === 'range' ? v >= ov.data[0] && v < ov.data[1] : ov.kind === 'partition' ? v >= ov.data.lo && v < ov.data.hi : true;
    const dim = ov && (ov.kind === 'range' || ov.kind === 'partition');
    const bh = Math.max(1, rowH - (rowH > 4 ? 1 : 0)), round = rowH >= 7 && g.roundRect;
    const box = (x, y, bw) => { if (round) { g.beginPath(); g.roundRect(x, y, bw, bh, Math.min(4, bh / 2)); g.fill(); } else g.fillRect(x, y, bw, bh); };
    const bar = (v, x0, y, alpha, touched = false) => {
      const len = 8 + (half - 26) * (v + 1) / n, on = inOv(v);
      g.globalAlpha = alpha * (dim && !on ? 0.28 : 1);
      if (ov?.kind === 'bit' && typeof ov.data === 'number') g.fillStyle = (v >> ov.data) & 1 ? `hsl(30 75% ${dark ? 60 : 50}%)` : `hsl(210 65% ${dark ? 62 : 50}%)`;
      else g.fillStyle = `hsl(${(v / n) * 270 + 200} 65% ${dark ? 62 : 52}%)`;
      box(x0 + 8, y, len);
      g.globalAlpha = alpha;
      if (ov?.kind === 'keep' && ov.data.has(v)) { g.fillStyle = ink; g.fillRect(x0 + 2, y, 4, bh); }
      if (ov?.kind === 'partition' && ov.data.cuts && on) { const c = ov.data.cuts; g.fillStyle = v >= c[1] ? css('--exc') : v >= c[0] ? css('--pass') : css('--good'); g.fillRect(x0 + 2, y, 4, bh); }
      if (focus && (v === focus.mover || v === focus.target)) { g.strokeStyle = v === focus.mover ? css('--focus') : ink; g.lineWidth = 2; g.strokeRect(x0 + 8, y, len, Math.max(2, bh)); }
      else if (touched) { g.strokeStyle = css('--focus'); g.lineWidth = 1.5; g.strokeRect(x0 + 8, y, len, Math.max(1, bh)); }
      if (n <= 30) { g.fillStyle = ink; g.font = `${Math.round(Math.min(16, rowH - 2))}px ${font}`; g.fillText(v, x0 + 13 + len, y + rowH * .74); }
      g.globalAlpha = 1;
    };
    g.save(); g.beginPath(); g.rect(0, top - 2, w, h - top + 2); g.clip();
    if (!tween) {
      A.forEach((v, i) => bar(v, 0, top + i * rowH, 1, touchA && (i < 2 || i === A.length - 1)));
      B.forEach((v, i) => bar(v, half, top + i * rowH, 1, touchB && (i < 2 || i === B.length - 1)));
    } else {
      // Animate the move: pushes slide across, swaps trade places, rotations wrap around.
      const [A1, B1] = applyOp(A, B, op), e = ease(this.frac), p1 = place(A1, B1);
      for (const [v, [s0, i0]] of place(A, B)) {
        const [s1, i1] = p1.get(v);
        if (s0 === s1 && Math.abs(i1 - i0) > 1) {   // wrapped: leaves one end, comes in at the other
          const d = Math.sign(i1 - i0);
          bar(v, s0 * half, top + (i0 - d * e) * rowH, 1 - e);
          bar(v, s1 * half, top + (i1 + d * (1 - e)) * rowH, e);
        } else bar(v, (s0 + (s1 - s0) * e) * half, top + (i0 + (i1 - i0) * e) * rowH, 1);
      }
    }
    g.restore();
    // The end: a banner.
    if (this.result && this.step >= this.total && !tween) {
      const ok = this.result.valid, t = ok ? `sorted in ${this.total} moves` : 'not sorted';
      g.font = `22px ${font}`; const tw = g.measureText(t).width + 26, bx = w - tw - 10, by = h - 42;
      g.fillStyle = ok ? css('--ok') : css('--bad'); g.globalAlpha = .95;
      if (g.roundRect) { g.beginPath(); g.roundRect(bx, by, tw, 32, 9); g.fill(); } else g.fillRect(bx, by, tw, 32);
      g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillText(t, bx + 13, by + 23);
    }
  }
}
// Link boards so they step together; each keeps its own length.
export function link(...boards) { for (const b of boards) b.peers = boards.filter(x => x !== b); }
