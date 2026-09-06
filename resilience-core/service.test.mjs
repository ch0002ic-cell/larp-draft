import test from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from './ledger.mjs';
import { createLedgerService } from './service.mjs';
import { seed, reviewer, sourceInput, artefactInput, span } from './fixtures.mjs';

function setup(t) {
  const ledger = new Ledger();
  t.after(() => ledger.close());
  const records = seed(ledger);
  const state = { time: 100, calls: 0,
    access: { active: true, subject: 'account', tenantId: reviewer.tenantId,
      userId: 'authenticated-user', roles: ['editor'], matterIds: [...reviewer.matterIds], aclVersion: '1' } };
  const service = createLedgerService({ ledger, now: () => state.time,
    verifySession: async (credential) => credential === 'valid'
      ? { subject: 'account', tenantId: reviewer.tenantId, expiresAt: 200 } : null,
    resolveAccess: async () => { state.calls++; return state.access; } });
  return { ledger, service, state, ...records };
}

test('missing or forged sessions fail without ledger writes', async (t) => {
  const { ledger, service, state } = setup(t);
  const before = ledger.audit(reviewer).length;
  for (const credential of [null, 'invalid', { ...reviewer }]) {
    await assert.rejects(service.execute(credential, 'addSource', sourceInput({ key: 'forged' })), /Access denied/);
  }
  assert.equal(state.calls, 0);
  assert.equal(ledger.audit(reviewer).length, before);
});

test('payload roles cannot grant review rights and audit uses resolved identity', async (t) => {
  const { service, state, source } = setup(t);
  const input = { key: 'new-rule', expectedVersion: 0, sourceId: source.id,
    interpretation: 'Synthetic', applicability: 'Synthetic', exceptions: 'None',
    evidence: span(source.body.text), actor: reviewer, roles: ['reviewer'] };
  await assert.rejects(service.execute('valid', 'addAssertion', input), /Forbidden/);
  state.access.roles = ['reviewer'];
  await service.execute('valid', 'addAssertion', input);
  const events = await service.execute('valid', 'audit');
  assert.equal(events.at(-1).actor, 'authenticated-user');
});

test('matter and account revocations apply on the next operation', async (t) => {
  const { service, state, artefact } = setup(t);
  await service.execute('valid', 'coverage', artefact.id);
  state.access.matterIds = [];
  state.access.aclVersion = '2';
  await assert.rejects(service.execute('valid', 'coverage', artefact.id), /Record unavailable/);
  assert.deepEqual(await service.execute('valid', 'list', 'artefact'), []);
  state.access.active = false;
  await assert.rejects(service.execute('valid', 'list', 'source'), /Access denied/);
  assert.equal(state.calls, 4);
});

test('mismatched or malformed permission records fail closed', async (t) => {
  const { service, state } = setup(t);
  const original = state.access;
  for (const change of [{ subject: 'someone-else' }, { tenantId: 'another-firm' },
    { roles: ['admin'] }, { matterIds: [''] }, { aclVersion: '' }, { userId: '' }]) {
    state.access = { ...original, ...change };
    await assert.rejects(service.execute('valid', 'list', 'source'), /Access denied/);
  }
});

test('expiry is checked both before and after permission resolution', async (t) => {
  const { ledger, service, state } = setup(t);
  state.time = 200;
  await assert.rejects(service.execute('valid', 'list', 'source'), /Access denied/);
  assert.equal(state.calls, 0);
  let time = 100;
  const delayed = createLedgerService({ ledger, now: () => time,
    verifySession: async () => ({ subject: 'account', tenantId: reviewer.tenantId, expiresAt: 200 }),
    resolveAccess: async () => { time = 200; return state.access; } });
  await assert.rejects(delayed.execute('valid', 'list', 'source'), /Access denied/);
});

test('provider outages hide details and internal methods cannot be invoked', async (t) => {
  const { ledger } = setup(t);
  for (const provider of ['session', 'access']) {
    const service = createLedgerService({ ledger,
      verifySession: async () => {
        if (provider === 'session') throw new Error('private provider details');
        return { subject: 'account', tenantId: reviewer.tenantId, expiresAt: Date.now() + 10000 };
      }, resolveAccess: async () => { throw new Error('private ACL details'); } });
    await assert.rejects(service.execute('valid', 'audit'), { message: 'Access denied' });
    for (const operation of ['close', 'constructor', '__proto__']) {
      await assert.rejects(service.execute('valid', operation), /Unsupported operation/);
    }
  }
});

test('queued input is snapshotted before asynchronous authentication', async (t) => {
  const { service } = setup(t);
  const input = artefactInput({ key: 'queued' });
  const pending = service.execute('valid', 'addArtefact', input);
  input.matterId = 'unauthorised';
  input.segments[0].text = 'changed';
  const saved = await pending;
  assert.equal(saved.matter, reviewer.matterIds[0]);
  assert.equal(saved.body.segments[0].text, artefactInput().segments[0].text);
});
