// Cover art for the Algorithm cards: each cover draws the card's idea, not a replay that looks the
// same on every card. Covers are SVG on a 96 × 48 grid, so they stay crisp at any card size.
// Values are coloured as a rainbow by rank, the same way the board colours its bars, so a sorted
// run reads as a smooth band of colour.

const rb = (v, n = 16) => `hsl(${Math.round((v / Math.max(1, n - 1)) * 270 + 200) % 360} 78% 62%)`;
const DIM = '#3b4757', INK = '#f5f1e6', GOLD = '#ffd45a', RED = '#ff6b6b', BLUE = '#5aa2f0', BOX = '#1c2632', EDGE = '#5d6b7a';
const n2 = x => +x.toFixed(2);
const rect = (x, y, w, h, f, o = 1, extra = '') => `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="${f}"${o < 1 ? ` opacity="${o}"` : ''}${extra}/>`;
const frame = (x, y, w, h, c, sw = 1) => `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
const line = (x1, y1, x2, y2, c, w = 1, dash = '') => `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''} shape-rendering="geometricPrecision" stroke-linecap="round"/>`;
const text = (x, y, s, size, f, anchor = 'middle') => `<text x="${n2(x)}" y="${n2(y)}" font-size="${size}" fill="${f}" text-anchor="${anchor}" font-family="'Jersey 10', ui-monospace, monospace">${s}</text>`;
const dot = (x, y, r, f, extra = '') => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="${f}" shape-rendering="geometricPrecision"${extra}/>`;
function arrow(x1, y1, x2, y2, c, w = 1.3) {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 3.2;
  return line(x1, y1, x2 - Math.cos(a) * 1.5, y2 - Math.sin(a) * 1.5, c, w) +
    `<path d="M${n2(x2)} ${n2(y2)} L${n2(x2 - h * Math.cos(a - .55))} ${n2(y2 - h * Math.sin(a - .55))} L${n2(x2 - h * Math.cos(a + .55))} ${n2(y2 - h * Math.sin(a + .55))} Z" fill="${c}" shape-rendering="geometricPrecision"/>`;
}
// Vertical bars standing on y = base: one per value, coloured by color(v, i).
const cols = (vals, x0, base, w, step, unit, color) => vals.map((v, i) => rect(x0 + i * step, base - (2.5 + v * unit), w, 2.5 + v * unit, color(v, i))).join('');

const COVERS = {
  // ---- small ----
  'hardcoded-three': () => {
    // all six orders of three numbers, each with its fixed answer
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    return perms.map((p, k) => {
      const x = 5 + (k % 3) * 31, y = 4 + Math.floor(k / 3) * 22;
      return rect(x - 2, y - 1, 26, 19, BOX) + cols(p, x, y + 16, 5, 7, 4.5, v => rb(v, 3)) + text(x + 23, y + 7, '✓', 7, GOLD, 'end');
    }).join('');
  },
  'five-hand': () => {
    // push the two smallest to B, sort the three left, bring them back
    let s = rect(2, 3, 30, 42, BOX) + text(17, 10, 'B', 7, EDGE);
    s += cols([0, 1], 9, 40, 6, 9, 3.5, v => rb(v, 5));
    s += rect(42, 3, 52, 42, BOX) + text(68, 10, 'A', 7, EDGE);
    s += cols([3, 4, 2], 51, 40, 7, 13, 3.5, v => rb(v, 5));
    s += arrow(58, 20, 72, 20, GOLD) + arrow(72, 24, 58, 24, GOLD);
    s += arrow(40, 30, 33, 30, INK) + arrow(33, 36, 40, 36, INK);
    return s;
  },
  oracle: () => {
    // every reachable order, ring by ring from the start; one shortest path shines
    let s = '';
    for (let ring = 1; ring <= 4; ring++) {
      const k = ring * 7, r = ring * 5.2;
      for (let i = 0; i < k; i++) { const a = i / k * 2 * Math.PI + ring; s += dot(48 + r * 2 * Math.cos(a) * .9, 24 + r * Math.sin(a) * .9, .9, ring === 4 ? DIM : EDGE); }
    }
    const path = [[48, 24], [55, 20], [62, 15], [70, 12], [80, 9]];
    s += path.slice(1).map((p, i) => line(path[i][0], path[i][1], p[0], p[1], GOLD, 1.3)).join('');
    s += dot(80, 9, 2, GOLD);
    // the eye at the centre
    s += `<ellipse cx="48" cy="24" rx="7" ry="4" fill="${INK}" shape-rendering="geometricPrecision"/>` + dot(48, 24, 2.4, '#1a6fd0') + dot(48, 24, 1, '#0b0f14');
    return `<g class="pulse">${s}</g>`;
  },
  // ---- selection ----
  'bubble-wheel': () => {
    // the numbers on a wheel: it turns, and a pair out of order gets swapped
    const n = 14, cx = 48, cy = 24, r = 17, order = [...Array(n).keys()];
    [order[5], order[6]] = [order[6], order[5]];
    let s = `<circle cx="${cx}" cy="${cy}" r="${r + 4.5}" fill="none" stroke="#2a3644" stroke-width="2" shape-rendering="geometricPrecision"/>`;
    let g = '';
    order.forEach((v, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      g += rect(x - 2.3, y - 2.3, 4.6, 4.6, rb(v, n));
      if (i === 5 || i === 6) g += frame(x - 3.8, y - 3.8, 7.6, 7.6, GOLD, 1);
    });
    s += `<g class="spin">${g}</g>` + text(cx, cy + 3, 'swap', 8, GOLD);
    return s;
  },
  'min-extract': () => {
    // grab the smallest left in A, again and again; B grows in order
    const a = [9, 4, 12, 7, 3, 14, 10, 6, 11, 5];
    let s = cols(a, 2, 44, 4.2, 5.4, 2.2, v => v === 3 ? GOLD : DIM);
    s += rect(60, 2, 1, 44, EDGE, .5);
    s += cols([0, 1, 2], 66, 44, 6, 7.5, 2.2, v => rb(v));
    s += frame(88.5, 44 - (2.5 + 3 * 2.2), 6, 2.5 + 3 * 2.2, GOLD, .8);
    s += arrow(24.5, 32, 30, 10, GOLD) + arrow(30, 10, 85, 30, GOLD);
    return s;
  },
  'twin-extract': () => {
    // the smallest or the largest, whichever is closer to a stack end
    const a = [8, 3, 11, 6, 2, 9, 5, 13, 7, 10];
    let s = cols([0, 1], 2, 44, 4, 5, 2.2, v => rb(v));
    s += cols(a, 22, 44, 3.8, 5.2, 2.2, v => v === 2 ? BLUE : v === 13 ? RED : DIM);
    s += cols([14, 15], 84, 44, 4, 5, 2.2, v => rb(v));
    s += arrow(43, 36, 14, 22, BLUE) + arrow(60, 12, 82, 8, RED);
    return s;
  },
  // ---- insertion ----
  'insert-into-b': () => {
    // B stays sorted; each new number drops into its gap
    let s = '';
    for (let v = 0; v < 12; v++) {
      const x = 4 + v * 7.5;
      if (v === 5) s += frame(x, 44 - (2.5 + v * 2.6), 5, 2.5 + v * 2.6, GOLD, .8);
      else s += rect(x, 44 - (2.5 + v * 2.6), 5, 2.5 + v * 2.6, rb(v, 12));
    }
    s += rect(41.5, 2, 5, 2.5 + 5 * 2.6, rb(5, 12)) + arrow(44, 21, 44, 27, GOLD);
    return s;
  },
  'simple-insertion': () => {
    // empty A into B, then insert each number back in order
    let s = rect(2, 2, 28, 44, BOX) + text(16, 9, 'B', 7, EDGE);
    s += cols([7, 2, 9, 4, 0], 5, 44, 3.6, 5, 2.4, v => v === 4 ? GOLD : DIM);
    s += rect(38, 2, 56, 44, BOX) + text(66, 9, 'A', 7, EDGE);
    [1, 3, 5, 6, 8, 10, 11].forEach((v, i) => s += rect(41 + i * 7.6 + (i >= 2 ? 7.6 : 0), 44 - (2.5 + v * 2.4), 5, 2.5 + v * 2.4, rb(v, 12)));
    s += frame(56.2, 44 - (2.5 + 4 * 2.4), 5, 2.5 + 4 * 2.4, GOLD, .8);
    s += arrow(22, 30, 54, 30, GOLD);
    return s;
  },
  'lis-insertion': () => {
    // the longest increasing line stays put; everything else is inserted around it
    const v = [3, 9, 1, 5, 12, 6, 2, 8, 14, 10, 4, 11, 15, 7, 13, 0];
    const best = [], prev = [], len = [];
    v.forEach((x, i) => { len[i] = 1; prev[i] = -1; for (let j = 0; j < i; j++) if (v[j] < x && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; } });
    for (let i = len.indexOf(Math.max(...len)); i >= 0; i = prev[i]) best.unshift(i);
    const P = i => [4 + i * 5.8, 42 - v[i] * 2.5];
    let s = best.slice(1).map((i, k) => line(...P(best[k]), ...P(i), GOLD, 1.2)).join('');
    v.forEach((x, i) => { const [px, py] = P(i), on = best.includes(i); s += rect(px - 1.8, py - 1.8, 3.6, 3.6, on ? rb(x) : DIM); });
    return s;
  },
  turk: () => {
    // price every candidate, move the cheapest
    const c = [[12, 5], [6, 3], [9, 1], [3, 4], [14, 6]];
    let s = '';
    c.forEach(([v, cost], i) => {
      const x = 6 + i * 18, best = cost === 1;
      s += rect(x, 44 - (2.5 + v * 1.7), 7, 2.5 + v * 1.7, best ? rb(v) : DIM);
      s += rect(x - 2.5, 3, 12, 10, best ? GOLD : '#2a3644', 1, ' rx="1.5"') + text(x + 3.5, 11, cost, 9, best ? '#2a1d00' : INK);
      if (best) s += arrow(x + 3.5, 14, x + 3.5, 20, GOLD) + frame(x - 1.5, 44 - (2.5 + v * 1.7) - 1.5, 10, 2.5 + v * 1.7 + 3, GOLD, .8);
    });
    return `<g class="glow">${s}</g>`;
  },
  // ---- bucket ----
  chunks: () => {
    // numbers shipped in crates: one band of values per crate
    const crates = [[2, 0, 3, 1], [6, 4, 7, 5], [9, 11, 8, 10], [13, 15, 12, 14]];
    return crates.map((vals, k) => {
      const x = 3 + k * 23.5;
      return rect(x, 10, 20, 35, '#3a2c1a') + frame(x, 10, 20, 35, '#a07a44', 1) + line(x, 18, x + 20, 18, '#a07a44', .8) +
        cols(vals, x + 2, 43, 3.2, 4.2, 1.45, v => rb(v)) + text(x + 10, 8, k + 1, 7, '#c9a46a');
    }).join('');
  },
  butterfly: () => {
    // B ends up shaped like wings: small values at the top and bottom, the big ones in the middle
    let s = rect(47, 2, 2, 44, GOLD);
    for (let i = 0; i < 13; i++) {
      const L = 5 + 34 * Math.abs(Math.sin(Math.PI * 2 * (i + .5) / 13)) ** .8, y = 3 + i * 3.35;
      s += rect(46 - L, y, L, 2.6, rb(i, 13)) + rect(50, y, L, 2.6, rb(i, 13));
    }
    return s;
  },
  'bucket-insertion': () => {
    // crates first, then each one unpacked carefully into place
    let s = '';
    [[[1, 3, 0, 2], 4], [[6, 4, 7, 5], 26]].forEach(([vals, y]) => { s += rect(2, y - 2, 30, 19, '#3a2c1a') + frame(2, y - 2, 30, 19, '#a07a44', 1) + cols(vals, 5, y + 15, 4.5, 6.5, 1.5, v => rb(v)); });
    for (let v = 0; v < 9; v++) { const x = 44 + v * 5.6; s += v === 5 ? frame(x, 44 - (2.5 + v * 3.6), 4, 2.5 + v * 3.6, GOLD, .8) : rect(x, 44 - (2.5 + v * 3.6), 4, 2.5 + v * 3.6, rb(v, 9)); }
    s += arrow(32, 26, 70, 22, GOLD);
    return s;
  },
  // ---- digit ----
  'lsd-radix': () => {
    // the bars after two passes: sorted by their last two bits, a rainbow in four runs; the bit
    // grid below shows each number's bits, and the bit sorted next shines
    const order = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15];
    let s = cols(order, 2.5, 29, 4, 5.8, 1.55, v => rb(v));
    s += rect(1, 35.5, 94, 4, GOLD, .18);
    order.forEach((v, i) => { for (let b = 0; b < 4; b++) s += rect(2.5 + i * 5.8, 32 + (3 - b) * 4, 4, 3, (v >> b) & 1 ? (b === 2 ? GOLD : INK) : '#26303c'); });
    return s;
  },
  'ternary-radix': () => {
    // three bins for the three digits 0, 1, 2
    const mix = [5, 1, 7, 3, 8, 0, 4, 6, 2];
    let s = cols(mix, 8, 12, 5.5, 9, .95, v => rb(v, 9));
    [[0, 3, 6], [1, 4, 7], [2, 5, 8]].forEach((b, k) => {
      const x = 4 + k * 31;
      s += rect(x, 20, 27, 26, BOX) + frame(x, 20, 27, 26, EDGE, .8) + cols(b, x + 4, 44, 5, 7, 2, v => rb(v, 9)) + text(x + 13.5, 19, k, 8, GOLD);
    });
    return s;
  },
  'msd-radix': () => {
    // split on the top bit, then split each half again: top-down
    let s = '';
    for (let lvl = 0; lvl < 4; lvl++) {
      const k = 2 ** lvl, w = 92 / k, y = 3 + lvl * 11;
      for (let i = 0; i < k; i++) {
        s += rect(2 + i * w + .6, y, w - 1.2, 8.5, rb(((i + .5) / k) * 15), lvl === 3 ? 1 : .3 + lvl * .22);
        if (lvl > 0 && lvl < 3) s += text(2 + i * w + w / 2, y + 6.8, i % 2, 7, '#0d141c');
      }
    }
    return s;
  },
  // ---- divide ----
  'quick-2way': () => {
    // a pivot splits the rest: smaller to one side, larger to the other
    let s = cols([3, 1, 5, 0, 4, 2, 6], 2, 40, 4.5, 6, 1.9, v => rb(v));
    s += rect(45.5, 40 - (2.5 + 7 * 1.9) - 4, 5, 2.5 + 7 * 1.9 + 4, GOLD) + text(48, 9, 'pivot', 7, GOLD);
    s += cols([12, 9, 14, 8, 11, 15, 10, 13], 53, 40, 4.2, 5.4, 1.9, v => rb(v));
    return s + arrow(43, 45, 4, 45, BLUE) + arrow(53, 45, 93, 45, RED);
  },
  'four-end-quicksort': () => {
    // four bins, one at each stack end: top and bottom of A, top and bottom of B
    let s = rect(47, 2, 2, 44, EDGE, .6) + text(24, 26.5, 'A', 8, EDGE) + text(72, 26.5, 'B', 8, EDGE);
    [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15]].forEach((vals, k) => {
      const x = k < 2 ? 3 : 52, y = k % 2 ? 29 : 2;
      s += rect(x - 1, y, 42, 17, BOX) + vals.map((v, i) => rect(x + 1, y + 1.5 + i * 3.8, 5 + v * 2.1, 2.8, rb(v))).join('');
    });
    return s;
  },
  'tape-merge': () => {
    // two sorted tapes, merged into one longer sorted tape
    let s = rect(0, 3, 42, 9, BOX) + rect(0, 36, 42, 9, BOX);
    [1, 4, 6, 9, 12].forEach((v, i) => s += rect(2 + i * 8, 4.5, 6, 6, rb(v)));
    [2, 3, 7, 10, 14].forEach((v, i) => s += rect(2 + i * 8, 37.5, 6, 6, rb(v)));
    s += line(42, 7.5, 50, 21.5, EDGE, 1.2) + line(42, 40.5, 50, 26.5, EDGE, 1.2);
    s += rect(50, 19.5, 46, 9, BOX);
    [1, 2, 3, 4, 6, 7, 9, 10, 12, 14].forEach((v, i) => s += rect(51.5 + i * 4.4, 21, 3.4, 6, rb(v)));
    return s;
  },
  'natural-merge': () => {
    // the runs already in the input, merged into one
    let s = '', x = 2;
    for (const r of [[2, 6, 11], [0, 4, 9, 13], [3, 7, 15]]) { s += cols(r, x, 42, 3.2, 4.2, 2.1, v => rb(v)); x += r.length * 4.2 + 3; }
    s += arrow(x - 1, 24, x + 8, 24, GOLD);
    const all = [2, 6, 11, 0, 4, 9, 13, 3, 7, 15].sort((a, b) => a - b);
    return s + cols(all, x + 11, 42, 2.5, 3.3, 2.1, v => rb(v));
  },
  // ---- search ----
  'lookahead-greedy': () => {
    // look two moves ahead, then make the first move of the best line
    const root = [10, 24], l1 = [[36, 9], [36, 24], [36, 39]], best = [1, 1];
    let s = '';
    l1.forEach((p, i) => {
      s += line(...root, ...p, i === best[0] ? GOLD : DIM, i === best[0] ? 1.4 : 1);
      [-6, 6].forEach((d, j) => { const q = [64, p[1] + d]; const on = i === best[0] && j === best[1]; s += line(...p, ...q, on ? GOLD : DIM, on ? 1.4 : 1) + dot(...q, 1.8, on ? GOLD : EDGE); });
      s += dot(...p, 2, i === best[0] ? GOLD : EDGE);
    });
    s += arrow(68, 30, 88, 30, GOLD);
    s += `<ellipse cx="10" cy="24" rx="6" ry="3.6" fill="${INK}" shape-rendering="geometricPrecision"/>` + dot(10, 24, 2, '#1a6fd0') + dot(10, 24, .8, '#0b0f14');
    return s;
  },
  'beam-sorter': () => {
    // a wide search, keeping only the best few plans at every step
    let s = `<path d="M6 24 L92 2 L92 30 Z" fill="${GOLD}" opacity=".14" shape-rendering="geometricPrecision"/>`;
    const levels = [[6], [24, 1], [42, 2], [60, 3], [78, 3], [92, 3]];
    let prev = [[6, 24]];
    for (let L = 1; L < levels.length; L++) {
      const x = levels[L][0], nodes = Array.from({ length: 6 }, (_, i) => [x, 4 + i * 8]);
      nodes.forEach((q, i) => { const p = prev[i % prev.length], kept = i < 3; s += line(...p, ...q, kept ? GOLD : '#2a3644', kept ? 1 : .8) + dot(...q, 1.6, kept ? GOLD : DIM); });
      prev = nodes.slice(0, 3);
    }
    return s + dot(6, 24, 2.4, INK);
  },
  annealer: () => {
    // shake the plan while it is hot, settle as it cools: the ball ends in the deepest valley
    const y = x => 26 + 9 * Math.sin(x / 7.5) + 5 * Math.sin(x / 3.1 + 1);
    let d = '';
    for (let x = 2; x <= 82; x += 1) d += `${x === 2 ? 'M' : 'L'}${x} ${n2(y(x))}`;
    let s = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".85" shape-rendering="geometricPrecision"/>`;
    let best = 2; for (let x = 2; x <= 82; x++) if (y(x) > y(best)) best = x;
    [14, 30, 52].forEach(x => s += dot(x, y(x) - 2.5, 1.6, DIM));
    s += `<g class="settle">${dot(best, y(best) - 2.6, 2.6, GOLD)}</g>`;
    // a thermometer, hot at the top and cooled at the bottom
    for (let i = 0; i < 8; i++) s += rect(88, 4 + i * 4.6, 4, 4.6, `hsl(${Math.round(10 + i * 30)} 85% 58%)`);
    return s + dot(90, 44, 3, 'hsl(220 85% 58%)');
  },
};

// The cover of a card, or a quiet pattern in its family colour if it has none yet.
export function cover(id) {
  const body = COVERS[id]?.() ?? '';
  return `<svg class="cover" viewBox="0 0 96 48" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
}
export const COVER_IDS = Object.keys(COVERS);
