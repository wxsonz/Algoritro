// A pool of Node worker threads that run measurement jobs (js/workers/jobs.js) in parallel.
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { availableParallelism } from 'node:os';

if (!isMainThread) {
  const { runJob } = await import('../js/workers/jobs.js');
  parentPort.on('message', async ({ id, job }) => {
    try { parentPort.postMessage({ id, result: await runJob(job) }); } catch (e) { parentPort.postMessage({ id, error: String(e.stack || e) }); }
  });
}
export function pool(size = Math.max(1, availableParallelism() - 2)) {
  const workers = [], queue = [], waiting = new Map(); let next = 0;
  const idle = [];
  const pump = () => { while (idle.length && queue.length) { const w = idle.pop(), q = queue.shift(); waiting.set(q.id, { ...q, w }); w.postMessage({ id: q.id, job: q.job }); } };
  for (let i = 0; i < size; i++) {
    const w = new Worker(new URL(import.meta.url));
    w.on('message', ({ id, result, error }) => { const q = waiting.get(id); waiting.delete(id); idle.push(w); if (error) q.reject(new Error(error)); else q.resolve(result); pump(); });
    w.on('error', e => { for (const q of waiting.values()) if (q.w === w) q.reject(e); });
    workers.push(w); idle.push(w);
  }
  return {
    run: job => new Promise((resolve, reject) => { queue.push({ id: next++, job, resolve, reject }); pump(); }),
    close: () => Promise.all(workers.map(w => w.terminate())),
    size,
  };
}
