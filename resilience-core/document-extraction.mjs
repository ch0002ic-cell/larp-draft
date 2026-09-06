import { Worker } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { extractText, maxInputBytes } from './extraction.mjs';

export const docxMediaType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const documentExtractionVersion = 'rich-document-v1';

export async function extractDocument(bytes, { mediaType, attachmentsComplete = false } = {}, { timeoutMs = 10000 } = {}) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Byte input required');
  if (mediaType === 'text/plain') return extractText(bytes, { mediaType, attachmentsComplete });
  const data = Uint8Array.from(bytes);
  const provenance = { contentHash: createHash('sha256').update(data).digest('hex'), byteLength: data.length,
    mediaType, attachmentsComplete: attachmentsComplete === true };
  const failed = (reason) => ({ extractionVersion: documentExtractionVersion, inventoryComplete: false,
    segments: [{ id: 'document', state: 'failed', reason }], provenance });
  if (data.length > maxInputBytes) return failed('Input exceeds the 1 MiB extraction limit');
  if (!['application/pdf', docxMediaType].includes(mediaType)) return failed('Unsupported document format');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new Error('Invalid parser timeout');
  return new Promise((resolve) => {
    let settled = false;
    let worker;
    try {
      worker = new Worker(new URL('./document-parser-worker.mjs', import.meta.url), {
        workerData: { bytes: data, mediaType }, transferList: [data.buffer],
        resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 }, stdout: true, stderr: true,
      });
    } catch { resolve(failed('Document parser could not start')); return; }
    // Parser diagnostics may contain document text. They are not application logs.
    worker.stdout.resume(); worker.stderr.resume();
    const finish = (result) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      void worker.terminate().then(() => resolve(result), () => resolve(result));
    };
    const timer = setTimeout(() => finish(failed('Document parser timed out; no partial success was recorded')), timeoutMs);
    worker.once('message', (result) => finish(result.failure ? failed(result.failure)
      : { extractionVersion: documentExtractionVersion, ...result, provenance: { ...provenance, ...result.provenance } }));
    worker.once('error', () => finish(failed('Document parser failed or exceeded its memory limit')));
    worker.once('exit', () => finish(failed('Document parser exited without a complete result')));
  });
}
