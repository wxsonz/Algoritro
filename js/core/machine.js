// The Machine: the two stacks of ranks that algorithms run on. Index 0 is the top.
// Every op is applied and recorded with the current phase and reason.
export const OPS = ['sa', 'sb', 'ss', 'pa', 'pb', 'ra', 'rb', 'rr', 'rra', 'rrb', 'rrr'];

export class Machine {
  // lean: record ops only, no steps (for measurement runs).
  constructor(ranks, { lean = false } = {}) {
    this.a = ranks.slice(); this.b = []; this.lean = lean;
    this.ops = []; this.steps = [];           // steps[i] = { op, phase, why, ov, focus }
    this._phase = ''; this._why = ''; this._ov = null; this._focus = null;
  }
  get size() { return { a: this.a.length, b: this.b.length }; }
  phase(name) { this._phase = name; this._why = ''; return this; }
  why(text) { this._why = text; return this; }
  // View annotations for the following ops. overlay kinds: keep (a Set of ranks), range [lo, hi),
  // bit, chunks (cut list), partition { loc, lo, hi }. focus: { mover, target } ranks.
  overlay(kind, data) { this._ov = data == null ? null : { kind, data }; return this; }
  focus(f) { this._focus = f || null; return this; }
  op(name, count = 1) {
    for (let i = 0; i < count; i++) {
      apply(this.a, this.b, name);
      this.ops.push(name);
      if (!this.lean) this.steps.push({ op: name, phase: this._phase, why: this._why, ov: this._ov, focus: this._focus });
    }
    return this;
  }
  // Bring index i of stack s ('a' or 'b') to its top by the shorter direction.
  bring(s, i) {
    const len = this[s].length; if (i <= 0 || len < 2) return this;
    if (i <= len / 2) this.op('r' + s, i); else this.op('rr' + s, len - i);
    return this;
  }
  indexOf(stack, rank) { return this[stack].indexOf(rank); }
  min(stack) { return Math.min(...this[stack]); }
  max(stack) { return Math.max(...this[stack]); }
}

function swap(s) { if (s.length > 1) { const t = s[0]; s[0] = s[1]; s[1] = t; } }
function rot(s) { if (s.length > 1) s.push(s.shift()); }
function rrot(s) { if (s.length > 1) s.unshift(s.pop()); }
function apply(a, b, name) {
  switch (name) {
    case 'sa': swap(a); break; case 'sb': swap(b); break; case 'ss': swap(a); swap(b); break;
    case 'pa': if (b.length) a.unshift(b.shift()); break;
    case 'pb': if (a.length) b.unshift(a.shift()); break;
    case 'ra': rot(a); break; case 'rb': rot(b); break; case 'rr': rot(a); rot(b); break;
    case 'rra': rrot(a); break; case 'rrb': rrot(b); break; case 'rrr': rrot(a); rrot(b); break;
    default: throw new Error('unknown op ' + name);
  }
}
