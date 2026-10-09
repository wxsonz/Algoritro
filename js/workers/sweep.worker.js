// Web Worker for many-seed runs: { id, job } in, { id, progress } and { id, result | error } out.
import { runJob } from './jobs.js';
self.onmessage = async ({ data: { id, job } }) => {
  try { const result = await runJob(job, p => self.postMessage({ id, progress: p })); self.postMessage({ id, result }); }
  catch (e) { self.postMessage({ id, error: String(e.message || e) }); }
};
