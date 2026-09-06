import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { once } from 'node:events';
import { createReviewServer, demoRuntime } from './review-server.mjs';
async function setup(t) {
  const runtime = demoRuntime(), server = createReviewServer({ runtime, demo: true });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); runtime.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const session = await fetch(`${origin}/session`).then((r) => r.json());
  const api = (input, headers = {}) => fetch(`${origin}/api`, { method: 'POST', headers: {
    Origin: origin, 'Content-Type': 'application/json', 'X-Larp-Token': session.token, ...headers }, body: JSON.stringify(input) });
  return { origin, api };
}
test('review console enforces legal/owner gates and publishes versioned changes', async (t) => {
  const { api } = await setup(t);
  const [record] = await (await api({ action: 'list' })).json();
  let view = await (await api({ action: 'view', id: record.id })).json();
  assert.equal(view.change.status, 'unreviewed'); assert.ok(view.evidence[0].source.body.text);
  assert.equal((await api({ action: 'publish', jobId: view.change.jobs[0].id })).status, 409);
  assert.equal((await api({ action: 'legal', id: record.id, disposition: 'approved', reason: 'Synthetic review', expectedRevision: 0 })).status, 200);
  assert.equal((await api({ action: 'legal', id: record.id, disposition: 'approved', reason: 'Stale', expectedRevision: 0 })).status, 409);
  for (let index = 0; index < 2; index++) assert.equal((await api({ action: 'owner', id: record.id, index, disposition: 'approved', reason: 'Synthetic owner review', expectedVersion: 0 })).status, 200);
  for (const job of view.change.jobs) assert.equal((await api({ action: 'publish', jobId: job.id })).status, 200);
  view = await (await api({ action: 'view', id: record.id })).json();
  assert.equal(view.change.status, 'published');
});
test('console rejects cross-origin, forged sessions, arbitrary operations and oversized bodies', async (t) => {
  const { origin, api } = await setup(t);
  for (const headers of [{ Origin: 'https://untrusted.example' }, { 'X-Larp-Token': 'forged' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.equal((await api({ action: 'list' }, headers)).status, 403);
  }
  assert.equal((await api({ action: 'addSource' })).status, 400);
  assert.equal((await api({ action: 'list', padding: 'x'.repeat(17000) })).status, 413);
  const hostStatus = await new Promise((resolve, reject) => {
    request(`${origin}/session`, { headers: { Host: 'untrusted.example' } }, (response) => { response.resume(); resolve(response.statusCode); }).on('error', reject).end();
  });
  assert.equal(hostStatus, 403);
});
test('console serves only explicit static assets, blocks framing and never caches evidence', async (t) => {
  const { origin, api } = await setup(t);
  const page = await fetch(origin);
  assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  for (const path of ['/../ledger.mjs', '/node_modules/tesseract.js/package.json', '/unknown']) assert.equal((await fetch(origin + path)).status, 404);
  const response = await api({ action: 'list' }); assert.equal(response.headers.get('cache-control'), 'no-store');
});
