import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Ledger } from './ledger.mjs';
import { LocalDocumentStore } from './local-document-store.mjs';
import { createPublicationWorker } from './publication-worker.mjs';
import { sourceInput, artefactInput } from './fixtures.mjs';
import { syntheticActor as actor, syntheticConnect, prepareWorkflow, approveWorkflow, approvedAssessment } from './workflow-fixtures.mjs';

function setup(t, count = 2) {
  const ledger = new Ledger(); const store = new LocalDocumentStore();
  t.after(() => { ledger.close(); store.close(); });
  const fixture = prepareWorkflow(ledger, store, count);
  const worker = createPublicationWorker({ ledger, connect: syntheticConnect, adapterFor: () => store });
  return { ledger, store, worker, ...fixture };
}

test('publication requires legal and recorded-owner approval and preserves original versions', async (t) => {
  const { ledger, store, worker, changeSet, artefacts } = setup(t);
  await assert.rejects(worker.run('synthetic', changeSet.jobs[0].id), /approvals/);
  ledger.reviewChangeSet(actor, changeSet.id, { disposition: 'approved', reason: 'Review', expectedRevision: 0 });
  await assert.rejects(worker.run('synthetic', changeSet.jobs[0].id), /approvals/);
  assert.throws(() => ledger.reviewOwnership({ ...actor, userId: 'not-owner' }, changeSet.id,
    { index: 0, disposition: 'approved', reason: 'Spoof', expectedVersion: 0 }), /recorded owner/);
  for (let index = 0; index < 2; index++) ledger.reviewOwnership(actor, changeSet.id,
    { index, disposition: 'approved', reason: 'Owner review', expectedVersion: 0 });
  const first = await worker.run('synthetic', changeSet.jobs[0].id);
  assert.equal(first.body.status, 'published');
  assert.equal(ledger.getChangeSet(actor, changeSet.id).status, 'partially_published');
  assert.equal((await worker.run('synthetic', changeSet.jobs[0].id)).id, first.id);
  assert.equal(store.read(changeSet.body.items[0].target).eTag, '"2"');
  await worker.run('synthetic', changeSet.jobs[1].id);
  assert.equal(ledger.getChangeSet(actor, changeSet.id).status, 'published');
  assert.equal(ledger.get(actor, artefacts[0].id, 'artefact').body.segments[0].text, 'Notify the incident owner.');
});

test('changed evidence, expired approvals and owner revocation stop queued work', async (t) => {
  const { ledger, worker, changeSet, source } = setup(t);
  approveWorkflow(ledger, changeSet);
  ledger.reviewOwnership(actor, changeSet.id, { index: 0, disposition: 'rejected', reason: 'Hold', expectedVersion: 1 });
  await assert.rejects(worker.run('synthetic', changeSet.jobs[0].id), /approvals/);
  ledger.addSource(actor, sourceInput({ expectedVersion: source.version, text: 'Another synthetic change.' }));
  await assert.rejects(worker.run('synthetic', changeSet.jobs[1].id), /superseded/);
  assert.equal(ledger.getChangeSet(actor, changeSet.id).status, 'review_required');
});

test('cross-matter reads and publication claims are denied', (t) => {
  const { ledger, changeSet } = setup(t);
  approveWorkflow(ledger, changeSet);
  for (const denied of [{ ...actor, matterIds: [] }, { ...actor, tenantId: 'other' }]) {
    assert.throws(() => ledger.getChangeSet(denied, changeSet.id), /unavailable/);
    assert.throws(() => ledger.claimPublication(denied, changeSet.jobs[0].id), /unavailable/);
  }
});

test('a concurrent document edit is blocked without overwriting the target', async (t) => {
  const { ledger, store, worker, changeSet } = setup(t);
  approveWorkflow(ledger, changeSet);
  const item = changeSet.body.items[1];
  store.replaceText(item.target, { expectedETag: item.target.eTag, expectedHash: item.target.hash,
    text: 'Concurrent owner edit', artefactType: 'checklist' });
  await worker.run('synthetic', changeSet.jobs[0].id);
  const conflict = await worker.run('synthetic', changeSet.jobs[1].id);
  assert.equal(conflict.body.status, 'blocked');
  assert.equal(store.read(item.target).bytes.toString(), 'Concurrent owner edit');
  assert.equal(ledger.getChangeSet(actor, changeSet.id).status, 'partially_published');
});

test('uncertain writes reconcile observed content without a second upload', async (t) => {
  const { ledger, store, changeSet } = setup(t, 1);
  approveWorkflow(ledger, changeSet);
  let uploads = 0;
  const worker = createPublicationWorker({ ledger, connect: syntheticConnect, adapterFor: () => ({
    read: (target) => store.read(target),
    replaceText: (target, input) => {
      uploads++; store.replaceText(target, input);
      throw Object.assign(new Error('Acknowledgement lost'), { publicationMayHaveOccurred: true });
    },
  }) });
  const interrupted = await worker.run('synthetic', changeSet.jobs[0].id);
  assert.equal(interrupted.body.status, 'reconciliation_required');
  await assert.rejects(worker.run('synthetic', interrupted.id), /reconciliation/);
  const recovered = await worker.reconcile('synthetic', interrupted.id, 'Compared destination content after lost acknowledgement.');
  assert.equal(recovered.body.status, 'published');
  assert.equal(uploads, 1);
  assert.match(recovered.body.receipt.attribution, /Observed/);
});

test('transient retries are delayed and bounded', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const { ledger, changeSet } = setup(t, 1);
  approveWorkflow(ledger, changeSet);
  const worker = createPublicationWorker({ ledger, connect: syntheticConnect,
    adapterFor: () => ({ replaceText: () => { throw Object.assign(new Error('Unavailable'), { retryable: true }); } }) });
  let job = await worker.run('synthetic', changeSet.jobs[0].id);
  await assert.rejects(worker.run('synthetic', job.id), /backoff/);
  for (let attempt = 2; attempt <= 3; attempt++) {
    t.mock.timers.tick(10000); job = await worker.run('synthetic', job.id);
    assert.equal(job.body.attempts, attempt);
  }
  t.mock.timers.tick(10000);
  await assert.rejects(worker.run('synthetic', job.id), /blocked/);
});

test('restart preserves pending jobs and completed receipts', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'larp-restart-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let ledger = new Ledger(join(dir, 'ledger.sqlite'));
  let store = new LocalDocumentStore(join(dir, 'destination.sqlite'));
  const { changeSet } = prepareWorkflow(ledger, store);
  approveWorkflow(ledger, changeSet);
  let worker = createPublicationWorker({ ledger, connect: syntheticConnect, adapterFor: () => store });
  await worker.run('synthetic', changeSet.jobs[0].id);
  ledger.close(); store.close();
  ledger = new Ledger(join(dir, 'ledger.sqlite')); store = new LocalDocumentStore(join(dir, 'destination.sqlite'));
  try {
    worker = createPublicationWorker({ ledger, connect: syntheticConnect, adapterFor: () => store });
    assert.equal(ledger.getChangeSet(actor, changeSet.id).status, 'partially_published');
    await worker.run('synthetic', changeSet.jobs[0].id);
    await worker.run('synthetic', changeSet.jobs[1].id);
    assert.equal(ledger.getChangeSet(actor, changeSet.id).status, 'published');
    assert.equal(store.read(changeSet.body.items[0].target).eTag, '"2"');
  } finally { ledger.close(); store.close(); }
});

test('rollback is a newly reviewed change set with a preserved receipt reference', async (t) => {
  const { ledger, store, worker, changeSet, assertion } = setup(t, 1);
  approveWorkflow(ledger, changeSet);
  const published = await worker.run('synthetic', changeSet.jobs[0].id);
  const current = ledger.get(actor, published.body.publishedArtefactId, 'artefact');
  const item = approvedAssessment(ledger, assertion, current, changeSet.body.items[0].beforeText);
  const rollback = ledger.proposeChangeSet(actor, { key: 'rollback', title: 'Synthetic reviewed rollback', rationale: 'Exercise compensation',
    reviewExpiresAt: new Date(Date.now() + 60000).toISOString(), rollbackOf: published.id, items: [item] });
  await assert.rejects(worker.run('synthetic', rollback.jobs[0].id), /approvals/);
  approveWorkflow(ledger, rollback);
  await worker.run('synthetic', rollback.jobs[0].id);
  assert.equal(store.read(item.target ?? changeSet.body.items[0].target).bytes.toString(), changeSet.body.items[0].beforeText);
  assert.equal(store.read(changeSet.body.items[0].target).eTag, '"3"');
  assert.equal(ledger.getChangeSet(actor, rollback.id).body.rollbackOf, published.id);
});

test('executed agreements and automated controls cannot enter the text publication queue', (t) => {
  const { ledger, assertion, artefacts } = setup(t, 1);
  for (const type of ['executed', 'control']) {
    const artefact = ledger.addArtefact(actor, artefactInput({ key: type, type, owner: actor.userId,
      segments: artefacts[0].body.segments, provenance: artefacts[0].body.provenance }));
    const item = approvedAssessment(ledger, assertion, artefact, 'New text');
    assert.throws(() => ledger.proposeChangeSet(actor, { key: type, title: type, rationale: 'test',
      reviewExpiresAt: new Date(Date.now() + 60000).toISOString(), items: [item] }), /Separate legal variation/);
  }
});

test('approval expiry prevents publication and expired in-flight work requires reconciliation', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const { ledger, worker, changeSet } = setup(t);
  approveWorkflow(ledger, changeSet);
  const running = ledger.claimPublication(actor, changeSet.jobs[0].id);
  t.mock.timers.tick(3600001);
  await assert.rejects(worker.run('synthetic', changeSet.jobs[1].id), /expired/);
  assert.throws(() => ledger.publicationInput(actor, running.id), /expired/);
  const item = changeSet.body.items[0];
  const reconciled = ledger.reconcilePublication(actor, running.id, { observedETag: item.target.eTag,
    observedHash: item.target.hash, reason: 'Target remains unchanged after interrupted work.' });
  assert.equal(reconciled.body.status, 'queued');
  await assert.rejects(worker.run('synthetic', reconciled.id), /expired/);
});

test('permission revocation after upload leaves an explicit uncertain job for authorized reconciliation', async (t) => {
  const { ledger, store, changeSet } = setup(t, 1);
  approveWorkflow(ledger, changeSet);
  let allowed = true;
  const worker = createPublicationWorker({ ledger,
    connect: () => { if (!allowed) throw new Error('Access denied'); return syntheticConnect(); },
    adapterFor: () => ({ replaceText: (target, input) => { const receipt = store.replaceText(target, input); allowed = false; return receipt; } }) });
  await assert.rejects(worker.run('synthetic', changeSet.jobs[0].id), /Access denied/);
  assert.equal(ledger.getChangeSet(actor, changeSet.id).jobs[0].body.status, 'running');
  assert.equal(store.read(changeSet.body.items[0].target).eTag, '"2"');
});

test('source changes during a write preserve the receipt but require renewed review', async (t) => {
  const { ledger, store, changeSet } = setup(t, 1);
  approveWorkflow(ledger, changeSet);
  const worker = createPublicationWorker({ ledger, connect: syntheticConnect,
    adapterFor: () => ({ replaceText: (target, input) => {
      const receipt = store.replaceText(target, input);
      ledger.addSource(actor, sourceInput({ expectedVersion: 1, text: 'A concurrent synthetic policy revision.' }));
      return receipt;
    } }) });
  const result = await worker.run('synthetic', changeSet.jobs[0].id);
  assert.equal(result.body.status, 'published_review_required');
  assert.equal(ledger.getChangeSet(actor, changeSet.id).status, 'published_review_required');
});

test('schema 1 upgrades preserve records and schema 2 prevents reopening with the old foundation', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'larp-migration-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'ledger.sqlite');
  const ledger = new Ledger(path);
  const source = ledger.addSource(actor, sourceInput()); ledger.close();
  const raw = new DatabaseSync(path); raw.exec('PRAGMA user_version=1'); raw.close();
  const upgraded = new Ledger(path);
  assert.equal(upgraded.get(actor, source.id, 'source').body.text, source.body.text); upgraded.close();
  const verified = new DatabaseSync(path);
  assert.equal(verified.prepare('PRAGMA user_version').get().user_version, 2); verified.close();
});
