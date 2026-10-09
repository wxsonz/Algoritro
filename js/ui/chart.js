// A small SVG line chart: series of [x, y] with optional [x, lo, hi] bands, reference lines,
// vertical markers and shaded x ranges. Log scales are optional.
import { el } from './common.js';

const PALETTE = ['var(--f-insertion)', 'var(--f-divide)', 'var(--f-selection)', 'var(--f-digit)', 'var(--f-bucket)', 'var(--f-search)'];
export const color = i => PALETTE[i % PALETTE.length];

export function lineChart({ series = [], refs = [], vlines = [], shades = [], xlog = false, ylog = false, xlabel = '', ylabel = '', w = 760, h = 340, yfmt = v => Math.round(v), xfmt = v => +v.toFixed(2) }) {
  const pts = series.flatMap(s => s.points.map(p => [p[0], p[1]]).concat(s.band ? s.band.flatMap(b => [[b[0], b[1]], [b[0], b[2]]]) : []));
  if (!pts.length) return el('p.muted', {}, 'No data yet.');
  const tx = v => xlog ? Math.log(v) : v, ty = v => ylog ? Math.log(Math.max(v, 1e-9)) : v;
  let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
  for (const r of refs) for (const p of r.points) { if (p[0] >= x0 && p[0] <= x1) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } }
  if (!ylog) { y0 = Math.min(0, y0); y1 *= 1.05; } else { const pos = pts.map(p => p[1]).filter(v => v > 0); y0 = Math.max(1, (pos.length ? Math.min(...pos) : 1) * 0.9); y1 = Math.max(y1, y0 * 2) * 1.1; }
  if (x0 === x1) x1 = x0 + 1; if (y0 === y1) y1 = y0 + 1;
  const L = 56, R = 12, T = 10, B = 34;
  const X = v => L + (w - L - R) * (tx(v) - tx(x0)) / (tx(x1) - tx(x0)), Y = v => T + (h - T - B) * (1 - (ty(v) - ty(y0)) / (ty(y1) - ty(y0)));
  const path = ps => ps.filter(p => p[1] > 0 || !ylog).map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(Math.min(Math.max(p[1], y0), y1)).toFixed(1)}`).join('');
  let s = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${ylabel} by ${xlabel}">`;
  for (const sh of shades) s += `<rect x="${X(Math.max(sh.from, x0))}" y="${T}" width="${Math.max(0, X(Math.min(sh.to, x1)) - X(Math.max(sh.from, x0)))}" height="${h - T - B}" fill="${sh.color || 'var(--soft)'}" opacity="${sh.opacity ?? 1}"><title>${sh.label || ''}</title></rect>`;
  const ticks = (a, b, log) => { if (!isFinite(a) || !isFinite(b) || b <= a) return []; if (log) { const out = []; for (let e = Math.floor(Math.log10(a)); e <= Math.ceil(Math.log10(b)) && out.length < 40; e++) for (const m of [1, 2, 5]) { const v = m * 10 ** e; if (v >= a && v <= b) out.push(v); } return out; } const step = 10 ** Math.floor(Math.log10((b - a) / 4 || 1)), k = Math.ceil((b - a) / step / 6); const out = []; for (let v = Math.ceil(a / (step * k)) * step * k; v <= b && out.length < 40; v += step * k) out.push(+v.toPrecision(12)); return out; };
  for (const v of (ticks(y0, y1, ylog).length >= 3 ? ticks(y0, y1, ylog) : ticks(y0, y1, false))) s += `<line class="axis" x1="${L}" x2="${w - R}" y1="${Y(v)}" y2="${Y(v)}" opacity=".5"/><text x="2" y="${Y(v) + 4}">${yfmt(v)}</text>`;
  for (const v of ticks(x0, x1, xlog)) s += `<text x="${X(v) - 8}" y="${h - 18}">${xfmt(v)}</text>`;
  s += `<text x="${w / 2 - 40}" y="${h - 2}">${xlabel}</text><text x="${L}" y="${T + 10}" style="font-size:10px">${ylabel}</text>`;
  for (const v of vlines) s += `<line x1="${X(v.x)}" x2="${X(v.x)}" y1="${T}" y2="${h - B}" stroke="${v.color || 'var(--accent)'}" stroke-width="${v.width || 1.5}" stroke-dasharray="${v.dash || ''}"/><text x="${X(v.x) + 3}" y="${T + 22}" fill="${v.color || 'var(--accent)'}" style="fill:${v.color || 'var(--accent)'}">${v.label || ''}</text>`;
  for (const r of refs) s += `<path d="${path(r.points)}" fill="none" stroke="${r.color || 'var(--muted)'}" stroke-width="1" stroke-dasharray="${r.dash || '4 3'}"/><text x="${X(r.points[r.points.length - 1][0]) - 70}" y="${Y(Math.min(r.points[r.points.length - 1][1], y1)) - 4}">${r.label || ''}</text>`;
  series.forEach((ser, i) => {
    const c = ser.color || color(i);
    if (ser.band) s += `<path d="${path(ser.band.map(b => [b[0], b[2]]))}L${ser.band.slice().reverse().map(b => `${X(b[0]).toFixed(1)},${Y(Math.max(b[1], y0)).toFixed(1)}`).join('L')}Z" fill="${c}" opacity=".15"/>`;
    s += `<path d="${path(ser.points)}" fill="none" stroke="${c}" stroke-width="2"/>`;
    for (const p of ser.points) s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="2.5" fill="${c}"><title>${ser.name}: ${xfmt(p[0])} → ${yfmt(p[1])}</title></circle>`;
  });
  s += '</svg>';
  const legend = el('div.legend2.small', {}, series.map((ser, i) => el('span', { style: { marginRight: '14px' } }, el('span', { style: { color: ser.color || color(i) } }, '━ '), ser.name)));
  return el('div', {}, el('div', { html: s }), legend);
}
