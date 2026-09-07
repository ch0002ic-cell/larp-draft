import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const uri = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
async function load(name, io) {
  const key = `io${Math.random()}`; globalThis[key] = io;
  const adapter = uri(`export const getR2Object=(...a)=>globalThis[${JSON.stringify(key)}].get(...a); export const putR2Json=(...a)=>globalThis[${JSON.stringify(key)}].put(...a);`);
  const source = stripTypeScriptTypes(await readFile(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8'))
    .replaceAll('"@/lib/r2"', JSON.stringify(adapter)).replace('import "server-only";', "");
  const loaded = await import(uri(source));
  return loaded;
}
test('catalogue preserves persisted source records and rejects unavailable or malformed storage', async () => {
  let response;
  const api = await load('singapore-regulations', { get: async () => response, put: async () => {} });
  const catalog = { fetchedAt: '2026-09-07', instruments: [{ id: 'PDPA2012', title: 'Stored source version' }] };
  response = Response.json(catalog); assert.deepEqual(await api.readRegulationCatalog(), catalog);
  for (const value of [new Response('', { status: 404 }), new Response('', { status: 503 }), Response.json({})]) {
    response = value; await assert.rejects(api.readRegulationCatalog());
  }
});
test('annotation and intake reads distinguish confirmed absence from outage and prevent destructive saves', async () => {
  for (const [file, read, write, input] of [
    ['singapore-regulations', 'readRegulationOverlays', 'writeRegulationOverlay', { regulationId: 'x' }],
    ['regulation-intake', 'readSavedLawChanges', 'saveLawChange', { summary: 'Reviewed', sources: [{ url: 'https://sso.agc.gov.sg/Act/X' }], changes: [], caveats: [] }],
  ]) {
    let status = 404, writes = 0;
    const api = await load(file, { get: async () => new Response('', { status }), put: async () => { writes++; } });
    assert.deepEqual(await api[read](), []);
    status = 503; await assert.rejects(api[read]()); await assert.rejects(api[write](input)); assert.equal(writes, 0);
  }
});
test('comparison requires persisted official-text output; absent snapshots are explicit', async () => {
  let response = new Response('', { status: 404 });
  const api = await load('pdpa-comparison', { get: async () => response });
  await assert.rejects(api.readPdpaComparison());
  response = new Response('', { status: 404 }); assert.equal(await api.readPdpaSourceSnapshot('2021-01-02'), null);
  response = Response.json({ generatedBy: 'verified-baseline', sourceCoverage: 'verified-change-records' });
  await assert.rejects(api.readPdpaComparison());
  response = new Response('', { status: 503 }); await assert.rejects(api.readPdpaSourceSnapshot('2021-01-02'));
});
test('review cache distinguishes misses from service failure and propagates persistence errors', async () => {
  let status = 404;
  const api = await load('contract-review-server-cache', { get: async () => new Response('', { status }), put: async () => { throw new Error('Storage unavailable'); } });
  assert.equal(await api.readCachedReview('document', 'rule', 'hash'), null);
  status = 503; await assert.rejects(api.readCachedReview('document', 'rule', 'hash'));
  await assert.rejects(api.writeCachedReview({ contractKey: 'document', regulationId: 'rule' }));
});
test('operational console rejects synthetic startup and missing Microsoft credentials', async () => {
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  for (const args of [[], ['--demo'], ['--microsoft']]) {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('./review-server.mjs', import.meta.url)), ...args], { env: {}, encoding: 'utf8', timeout: 5000 });
    assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.match(result.stderr, /requires --microsoft/);
  }
});
