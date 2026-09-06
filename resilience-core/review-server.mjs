import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Ledger } from './ledger.mjs';
import { LocalDocumentStore } from './local-document-store.mjs';
import { prepareWorkflow, syntheticActor, syntheticConnect } from './workflow-fixtures.mjs';
import { createPublicationWorker } from './publication-worker.mjs';
import { createMicrosoftRuntime } from './microsoft-runtime.mjs';

const staticFiles = new Map([
  ['/', ['review-ui/index.html', 'text/html']],
  ['/app.js', ['review-ui/app.js', 'text/javascript']],
  ['/style.css', ['review-ui/style.css', 'text/css']],
]);
export function demoRuntime() {
  const ledger = new Ledger(':memory:'), store = new LocalDocumentStore();
  prepareWorkflow(ledger, store);
  const worker = createPublicationWorker({ ledger, connect: syntheticConnect, adapterFor: () => store });
  return { execute: async (_credential, operation, ...args) => ledger[operation](syntheticActor, ...args),
    publish: worker.run, reconcile: worker.reconcile, close: () => { ledger.close(); store.close(); } };
}
// Local operator console only. No remote binding, cookies, browser tokens or arbitrary domain operations.
export function createReviewServer({ runtime, credential, demo = false }) {
  const token = randomBytes(32).toString('hex');
  let busy = false;
  const server = createServer(async (request, response) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" };
    const send = (status, body, type = 'application/json') => {
      response.writeHead(status, { ...headers, 'Content-Type': `${type}; charset=utf-8` });
      response.end(type === 'application/json' ? JSON.stringify(body) : body);
    };
    if (request.headers.host !== origin.slice(7) || (request.headers.origin && request.headers.origin !== origin)
      || ['cross-site', 'same-site'].includes(request.headers['sec-fetch-site'])) return send(403, { error: 'Local origin required' });
    if (request.method === 'GET' && staticFiles.has(request.url)) {
      const [file, type] = staticFiles.get(request.url);
      return send(200, readFileSync(new URL(file, import.meta.url)), type);
    }
    if (request.method === 'GET' && request.url === '/session') return send(200, { token, demo });
    if (request.method !== 'POST' || request.url !== '/api') return send(404, { error: 'Unavailable' });
    const supplied = Buffer.from(request.headers['x-larp-token'] ?? '');
    if (request.headers.origin !== origin || request.headers['content-type'] !== 'application/json'
      || supplied.length !== token.length || !timingSafeEqual(supplied, Buffer.from(token))) return send(403, { error: 'Local session required' });
    if (busy) return send(409, { error: 'Another operation is in progress. Refresh when it finishes.' });
    busy = true;
    try {
      let size = 0; const chunks = [];
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 16384) { send(413, { error: 'Request too large' }); return; }
        chunks.push(chunk);
      }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      let result;
      if (input.action === 'list') result = await runtime.execute(credential, 'list', 'change_set');
      else if (input.action === 'view') {
        const change = await runtime.execute(credential, 'getChangeSet', input.id);
        const evidence = [];
        for (const item of change.body.items) {
          evidence.push({ assessment: await runtime.execute(credential, 'getAssessment', item.assessmentId),
            assertion: await runtime.execute(credential, 'get', item.assertionId, 'assertion'),
            source: await runtime.execute(credential, 'get', item.sourceId, 'source') });
        }
        result = { change, evidence };
      } else if (input.action === 'legal') result = await runtime.execute(credential, 'reviewChangeSet', input.id,
        { disposition: input.disposition, reason: input.reason, expectedRevision: input.expectedRevision });
      else if (input.action === 'owner') result = await runtime.execute(credential, 'reviewOwnership', input.id,
        { index: input.index, disposition: input.disposition, reason: input.reason, expectedVersion: input.expectedVersion });
      else if (input.action === 'publish') result = await runtime.publish(credential, input.jobId);
      else if (input.action === 'reconcile') result = await runtime.reconcile(credential, input.jobId, input.reason);
      else return send(400, { error: 'Unsupported review action' });
      send(200, result);
    } catch {
      send(409, { error: 'Operation could not complete. Refresh and check access, approval, evidence versions and publication status.' });
    } finally { busy = false; }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  server.timeout = 30000;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.umask(0o077);
  const demo = process.argv[2] === '--demo';
  let ledger, runtime;
  try {
    if (!demo && process.argv[2] !== '--microsoft') throw new Error('Choose --demo or --microsoft');
    if (demo) runtime = demoRuntime();
    else {
      if (!process.env.LARP_ACCESS_TOKEN || !process.env.LARP_LEDGER_PATH) throw new Error('Configuration required');
      const config = JSON.parse(readFileSync(process.env.LARP_MICROSOFT_CONFIG, 'utf8'));
      ledger = new Ledger(process.env.LARP_LEDGER_PATH);
      runtime = createMicrosoftRuntime({ ledger, config, clientSecret: process.env.LARP_ENTRA_CLIENT_SECRET });
    }
    const server = createReviewServer({ runtime, credential: process.env.LARP_ACCESS_TOKEN, demo });
    server.on('error', () => { console.error('Review console could not start. Check local configuration and port availability.'); runtime?.close?.(); ledger?.close(); process.exitCode = 1; });
    server.listen(4173, '127.0.0.1', () => console.log(`L.A.R.P. ${demo ? 'synthetic demo' : 'Microsoft operator console'}: http://127.0.0.1:4173`));
    const stop = () => server.close(() => { runtime?.close?.(); ledger?.close(); });
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  } catch {
    runtime?.close?.(); ledger?.close();
    console.error('Review console requires --demo or --microsoft with local Microsoft configuration and credentials.'); process.exitCode = 1;
  }
}
