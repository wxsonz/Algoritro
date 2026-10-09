// Counts, grades, pass rates and summary stats.
import { OPS } from './machine.js';

export const BARS = { 100: { PASS: 2000, GOOD: 1500, EXCELLENT: 700 }, 500: { PASS: 12000, GOOD: 8000, EXCELLENT: 5500 } };

// Thresholds for any n: exact at 100 and 500, a power law through both points elsewhere.
export function thresholds(n) {
  if (BARS[n]) return { ...BARS[n], approx: false };
  const t = {};
  for (const k of ['PASS', 'GOOD', 'EXCELLENT']) {
    const p = Math.log(BARS[500][k] / BARS[100][k]) / Math.log(5);
    t[k] = BARS[100][k] * Math.pow(n / 100, p);
  }
  return { ...t, approx: true };
}
export function grade(n, ops) {
  const t = thresholds(n);
  const g = ops < t.EXCELLENT ? 'EXCELLENT' : ops < t.GOOD ? 'GOOD' : ops < t.PASS ? 'PASS' : 'FAIL';
  return t.approx ? '~' + g : g;
}
// Per-op counts in the --bench layout.
export function counts(ops) { const c = Object.fromEntries(OPS.map(o => [o, 0])); for (const o of ops) c[o]++; return c; }
export function stats(xs) {
  const n = xs.length; if (!n) return null;
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1));
  const min = Math.min(...xs), max = Math.max(...xs);
  return { n, mean, sd, min, max, spread: mean ? (max - min) / mean : 0 };
}
export function passRate(n, xs) {
  const t = thresholds(n), share = lim => xs.filter(x => x < lim).length / xs.length;
  return { EXCELLENT: share(t.EXCELLENT), GOOD: share(t.GOOD), PASS: share(t.PASS) };
}

// Paired difference b − a on the same inputs: mean, standard error.
export function paired(a, b) {
  const d = b.map((x, i) => x - a[i]), s = stats(d);
  return { mean: s.mean, se: s.sd / Math.sqrt(d.length), n: d.length };
}
// Interaction of two techniques (spec/02 §2.5): I = Δ(both) − Δ(first) − Δ(second), paired on the
// same inputs. ✦ synergy when I < −2 SE, ✕ overlap when I > 2 SE, clash when both is worse than
// the better card alone.
export function interaction(base, first, second, both) {
  const d = both.map((x, i) => x - first[i] - second[i] + base[i]), s = stats(d), se = s.sd / Math.sqrt(d.length);
  const mean = v => v.reduce((t, x) => t + x, 0) / v.length;
  const clash = mean(both) > Math.min(mean(first), mean(second));
  return { I: s.mean, se, badge: clash ? 'clash' : s.mean < -2 * se ? 'synergy' : s.mean > 2 * se ? 'overlap' : 'additive' };
}

// Growth (spec/09): fit ops ≈ a·f(n) + b·n on the sizes up to 1000, then compare larger sizes.
export const CLASS_F = { 'n²': n => n * n, 'n√n': n => n * Math.sqrt(n), 'n log n': n => n * Math.log2(n) };
export const GROWTH_SIZES = [16, 32, 64, 100, 128, 256, 500, 512, 1000];
export const OFFLINE_SIZES = [2048, 4096];
export function fitGrowth(points, cls) {
  const f = CLASS_F[cls]; if (!f) return null;
  let sff = 0, sfn = 0, snn = 0, syf = 0, syn = 0;
  for (const [n, y] of points) { if (n > 1000) continue; const F = f(n); sff += F * F; sfn += F * n; snn += n * n; syf += y * F; syn += y * n; }
  const det = sff * snn - sfn * sfn, a = (syf * snn - syn * sfn) / det, b = (sff * syn - sfn * syf) / det;
  return { a, b, predict: n => a * f(n) + b * n };
}
// → { fit, checks: [{ n, measured, predicted, excess }], flagged }
export function classCheck(points, cls, tolerance = 0.05) {
  const fit = fitGrowth(points, cls); if (!fit) return { fit: null, checks: [], flagged: false };
  const checks = points.filter(([n]) => n > 1000).map(([n, y]) => { const p = fit.predict(n); return { n, measured: y, predicted: p, excess: y / p - 1 }; });
  return { fit, checks, flagged: checks.some(c => c.excess > tolerance) };
}
