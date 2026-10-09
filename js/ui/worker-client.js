// Runs measurement jobs in a Web Worker (with progress and cancel), or inline when module workers
// are unavailable.
import { runJob } from '../workers/jobs.js';

// Each lane has its own worker, so cancelling one lane (which terminates its worker) leaves the
// others running.
const workers = {}; let nextId = 0; const pending = new Map();
function getWorker(lane) {
  if (workers[lane] != null) return workers[lane];
  try {
    const w = workers[lane] = new Worker(new URL('../workers/sweep.worker.js', import.meta.url), { type: 'module' });
    w.onmessage = ({ data }) => { const p = pending.get(data.id); if (!p) return; if ('progress' in data) p.onProgress?.(data.progress); else { pending.delete(data.id); data.error ? p.reject(new Error(data.error)) : p.resolve(data.result); } };
    w.onerror = () => { for (const [id, p] of pending) if (p.lane === lane) { p.reject(new Error('worker failed')); pending.delete(id); } workers[lane] = false; };
  } catch { workers[lane] = false; }
  return workers[lane];
}
// → { promise, cancel }
export function run(job, onProgress, lane = 'main') {
  const w = getWorker(lane);
  if (!w) { let cancelled = false; return { promise: runJob(job, p => !cancelled && onProgress?.(p)), cancel: () => { cancelled = true; } }; }
  const id = nextId++;
  const promise = new Promise((resolve, reject) => pending.set(id, { resolve, reject, onProgress, lane }));
  w.postMessage({ id, job });
  return { promise, cancel: () => { const p = pending.get(id); if (!p) return; pending.delete(id); p.reject(new Error('cancelled')); w.terminate(); workers[lane] = null;
    for (const [k, q] of pending) if (q.lane === lane) { q.reject(new Error('cancelled')); pending.delete(k); } } };
}
// Many jobs in sequence, with overall progress.
export function runAll(jobs, onProgress, lane = 'main') {
  let cur = null, cancelled = false;
  const promise = (async () => {
    const out = [];
    for (let i = 0; i < jobs.length; i++) {
      if (cancelled) throw new Error('cancelled');
      cur = run(jobs[i], p => onProgress?.((i + p) / jobs.length), lane);
      out.push(await cur.promise);
    }
    return out;
  })();
  return { promise, cancel: () => { cancelled = true; cur?.cancel(); } };
}
