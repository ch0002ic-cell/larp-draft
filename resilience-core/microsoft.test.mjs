import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generateKeyPair, SignJWT } from 'jose';
import { createMicrosoftAdapters, createGraphClient, createSharePointAdapter } from './microsoft.mjs';
import { createMicrosoftRuntime } from './microsoft-runtime.mjs';
import { Ledger } from './ledger.mjs';

const tenantId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const frontend = '33333333-3333-4333-8333-333333333333';
const user = '44444444-4444-4444-8444-444444444444';
const group = '55555555-5555-4555-8555-555555555555';
const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
const config = { tenantId, clientId, allowedClientIds: [frontend], scope: 'access_as_user',
  groupMappings: [{ groupId: group, roles: ['reviewer'], matterIds: ['matter'] }] };
const pair = await generateKeyPair('RS256');
const token = (overrides = {}, signingKey = pair.privateKey) => new SignJWT({ tid: tenantId, oid: user,
  azp: frontend, ver: '2.0', scp: 'access_as_user', ...overrides })
  .setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer(overrides.iss ?? issuer)
  .setAudience(overrides.aud ?? clientId).setIssuedAt().setNotBefore(overrides.nbf ?? '0s')
  .setExpirationTime(overrides.exp ?? '5m').sign(signingKey);
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

test('Entra verifies signature, issuer, audience, tenant, client, delegated scope and expiry', async () => {
  const adapters = createMicrosoftAdapters(config, { clientSecret: 'test-only', jwks: pair.publicKey });
  assert.equal((await adapters.verifySession(await token())).subject, user);
  for (const override of [{ tid: frontend }, { aud: frontend }, { iss: 'https://example.test' },
    { azp: user }, { scp: 'wrong_scope' }, { scp: undefined, roles: ['reviewer'] },
    { ver: '1.0' }, { exp: '-1m' }, { nbf: '5m' }, { oid: '' }]) {
    await assert.rejects(adapters.verifySession(await token(override)));
  }
  const other = await generateKeyPair('RS256');
  await assert.rejects(adapters.verifySession(await token({}, other.privateKey)));
});

test('delegated membership is paginated and refreshed; assertion tokens stay at Entra', async () => {
  let permitted = true;
  const requests = [];
  const adapters = createMicrosoftAdapters(config, { clientSecret: 'test-only', jwks: pair.publicKey,
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options });
      if (String(url).includes('/token')) return json({ token_type: 'Bearer', access_token: 'graph-only' });
      assert.equal(options.headers.Authorization, 'Bearer graph-only');
      if (String(url).includes('/me?')) return json({ id: user });
      if (String(url).includes('skiptoken')) return json({ value: permitted ? [{ id: group, '@odata.type': '#microsoft.graph.group' }] : [] });
      return json({ value: [], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/transitiveMemberOf?$skiptoken=next' });
    } });
  const credential = await token();
  const first = await adapters.connect(credential);
  assert.deepEqual(first.access.matterIds, ['matter']);
  assert.equal(new URLSearchParams(requests[0].options.body).get('assertion'), credential);
  assert.equal(new URLSearchParams(requests[0].options.body).get('requested_token_use'), 'on_behalf_of');
  permitted = false;
  await assert.rejects(adapters.connect(credential), /Access denied/);
});

test('membership failures, pagination loops and delegated identity mismatch fail closed', async () => {
  for (const mode of ['mismatch', 'external', 'loop', 'outage']) {
    const adapters = createMicrosoftAdapters(config, { clientSecret: 'test-only', jwks: pair.publicKey,
      fetchImpl: async (url) => {
        if (String(url).includes('/token')) return json({ token_type: 'Bearer', access_token: 'graph-only' });
        if (String(url).includes('/me?')) return json({ id: mode === 'mismatch' ? group : user });
        if (mode === 'outage') return json({}, 503);
        return json({ value: [], '@odata.nextLink': mode === 'external' ? 'https://example.test/steal'
          : 'https://graph.microsoft.com/v1.0/me/transitiveMemberOf' });
      } });
    await assert.rejects(adapters.connect(await token()));
  }
  let calls = 0;
  const graph = createGraphClient('secret', { fetchImpl: async () => { calls++; } });
  await assert.rejects(graph.json('https://example.test/v1.0/me'), /Untrusted/);
  assert.equal(calls, 0);
});

function sharePointFixture() {
  const target = { matterId: 'matter', driveId: 'drive', folderId: 'folder', itemId: 'item' };
  const state = { text: 'Old wording', eTag: '"1"', uploads: 0, conflict: false, moved: false, badHost: false };
  const graph = { async json(path, options) {
    if (path.endsWith('/createUploadSession')) {
      assert.equal(options.headers['If-Match'], '"1"');
      if (state.conflict) throw new Error('412 Precondition Failed');
      return { uploadUrl: 'https://tenant.sharepoint.com/upload?secret=preauth' };
    }
    return { id: 'item', parentReference: { id: state.moved ? 'elsewhere' : 'folder', driveId: 'drive' },
      size: Buffer.byteLength(state.text), eTag: state.eTag, name: 'sample.txt', file: { mimeType: 'text/plain' },
      '@microsoft.graph.downloadUrl': `https://${state.badHost ? 'example.test' : 'tenant.sharepoint.com'}/download?secret=preauth` };
  } };
  const adapter = createSharePointAdapter({ graph, access: { active: true, roles: ['reviewer'], matterIds: ['matter'] },
    folders: [target], transferHosts: ['tenant.sharepoint.com'], fetchImpl: async (url, options) => {
      assert.equal(options.headers?.Authorization, undefined);
      assert.equal(options.redirect, 'manual');
      if (options.method === 'PUT') {
        state.uploads++; state.text = options.body.toString(); state.eTag = '"2"';
        return json({ id: 'item' }, 201);
      }
      return new Response(state.text);
    } });
  const input = { expectedETag: '"1"', expectedHash: createHash('sha256').update(state.text).digest('hex'),
    text: 'Reviewed new wording', artefactType: 'template' };
  return { adapter, target, input, state };
}

test('SharePoint uses version preconditions, no bearer on transfer URLs and verified content', async () => {
  const { adapter, target, input, state } = sharePointFixture();
  const receipt = await adapter.replaceText(target, input);
  assert.equal(receipt.beforeETag, '"1"'); assert.equal(receipt.afterETag, '"2"');
  assert.equal(state.uploads, 1);
  assert.equal((await adapter.read(target)).bytes.toString(), input.text);
});

test('SharePoint rejects cross-matter, moved, executed, untrusted-host and stale-version writes', async () => {
  for (const mode of ['matter', 'moved', 'executed', 'host', 'etag', 'hash', 'race']) {
    const { adapter, target, input, state } = sharePointFixture();
    if (mode === 'matter') target.matterId = 'secret';
    if (mode === 'moved') state.moved = true;
    if (mode === 'executed') input.artefactType = 'executed';
    if (mode === 'host') state.badHost = true;
    if (mode === 'etag') input.expectedETag = '"0"';
    if (mode === 'hash') input.expectedHash = 'incorrect';
    if (mode === 'race') state.conflict = true;
    await assert.rejects(adapter.replaceText(target, input));
    assert.equal(state.uploads, 0);
  }
});

test('Microsoft runtime imports verified bytes and removes cached matter access after SharePoint revocation', async (t) => {
  const ledger = new Ledger(); t.after(() => ledger.close());
  let revoked = false;
  const runtime = createMicrosoftRuntime({ ledger, clientSecret: 'test-only', config: { ...config,
    folders: [{ matterId: 'matter', driveId: 'drive', folderId: 'folder' }], transferHosts: ['tenant.sharepoint.com'] } },
  { jwks: pair.publicKey, fetchImpl: async (url) => {
    const value = String(url);
    if (value.includes('/token')) return json({ token_type: 'Bearer', access_token: 'graph-only' });
    if (value.includes('/me?')) return json({ id: user });
    if (value.includes('/transitiveMemberOf')) return json({ value: [{ id: group, '@odata.type': '#microsoft.graph.group' }] });
    if (value.startsWith('https://tenant.sharepoint.com/')) return new Response('Notify owner.');
    if (revoked) return json({}, 403);
    return json({ id: 'item', parentReference: { id: 'folder', driveId: 'drive' }, eTag: '"1"',
      name: 'test.txt', file: { mimeType: 'text/plain' }, size: 13,
      '@microsoft.graph.downloadUrl': 'https://tenant.sharepoint.com/download' });
  } });
  const credential = await token();
  const imported = await runtime.importSharePoint(credential, { key: 'import', expectedVersion: 0,
    title: 'Synthetic', owner: user, type: 'template', attachmentsComplete: true,
    target: { matterId: 'matter', driveId: 'drive', folderId: 'folder', itemId: 'item' } });
  assert.equal(imported.body.provenance.remote.eTag, '"1"');
  assert.equal(imported.body.segments[0].text, 'Notify owner.');
  assert.equal((await runtime.execute(credential, 'list', 'artefact')).length, 1);
  await assert.rejects(runtime.execute(credential, 'ingestText', {}), /verified SharePoint import/);
  revoked = true;
  assert.deepEqual(await runtime.execute(credential, 'list', 'artefact'), []);
  await assert.rejects(runtime.execute(credential, 'coverage', imported.id), /Record unavailable/);
});

test('Graph throttling carries the server retry delay to the publication queue', async () => {
  const graph = createGraphClient('test-only', { fetchImpl: async () => new Response('{}',
    { status: 429, headers: { 'Retry-After': '120' } }) });
  await assert.rejects(graph.json('me'), (error) => error.retryable && error.retryAfterMs === 120000);
});
