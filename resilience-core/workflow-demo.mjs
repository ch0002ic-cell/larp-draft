import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Ledger } from './ledger.mjs';
import { LocalDocumentStore } from './local-document-store.mjs';
import { createPublicationWorker } from './publication-worker.mjs';
import { snapshotLedger, restoreLedger, verifyLedgerFile } from './recovery.mjs';
import { sourceInput, artefactInput, span } from './fixtures.mjs';
import { syntheticActor as actor, syntheticConnect, approvedAssessment, approveWorkflow } from './workflow-fixtures.mjs';

const started = performance.now(); const cpuStart = process.cpuUsage();
const directory = mkdtempSync(join(tmpdir(), 'larp-maintenance-'));
const database = join(directory, 'ledger.sqlite'); const destination = join(directory, 'destination.sqlite');
let ledger = new Ledger(database); let store = new LocalDocumentStore(destination);
try {
  const originalSource = ledger.addSource(actor, sourceInput());
  const assertionInput = { key: 'synthetic-duty', expectedVersion: 0, sourceId: originalSource.id,
    evidence: span(originalSource.body.text), interpretation: 'Synthetic owner-notification expectation.',
    applicability: 'Only these generated fixtures.', exceptions: 'Not a statement of real law.' };
  const originalAssertion = ledger.addAssertion(actor, assertionInput);
  const artefacts = ['template', 'checklist', 'playbook'].map((type) => {
    const text = 'Notify the incident owner.';
    const target = { matterId: actor.matterIds[0], driveId: 'synthetic-drive', folderId: 'synthetic-folder', itemId: type };
    const remote = store.seed(target, text);
    const artefact = ledger.addArtefact(actor, artefactInput({ key: type, type, owner: actor.userId,
      segments: [{ id: 'document', state: 'available', text }],
      provenance: { remote: { ...target, eTag: remote.eTag, hash: remote.hash } } }));
    const dependency = ledger.proposeDependency(actor, { artefactId: artefact.id, assertionId: originalAssertion.id,
      segmentId: 'document', evidence: span(text), rationale: 'Synthetic confirmed dependency.', discovery: 'manual' });
    ledger.reviewDependency(actor, dependency.id, { disposition: 'confirmed', reason: 'Synthetic review.', expectedRevision: 0 });
    return artefact;
  });
  const changedSource = ledger.addSource(actor, sourceInput({ expectedVersion: 1,
    text: 'Notify the incident owner and record acknowledgement.' }));
  const plan = ledger.planSourceChange(actor, changedSource.id);
  const assertion = ledger.addAssertion(actor, { ...assertionInput, expectedVersion: 1, sourceId: changedSource.id,
    evidence: span(changedSource.body.text), interpretation: 'Synthetic acknowledgement expectation.' });
  const discovery = ledger.discover(actor, assertion.id, { phrases: ['incident owner'] });
  const items = artefacts.map((artefact) => approvedAssessment(ledger, assertion, artefact, changedSource.body.text));
  const changeSet = ledger.proposeChangeSet(actor, { key: 'synthetic-propagation', title: 'Synthetic coordinated update',
    rationale: 'Maintain three artefact types after a synthetic source change.',
    reviewExpiresAt: new Date(Date.now() + 3600000).toISOString(), items });
  approveWorkflow(ledger, changeSet);
  let worker = createPublicationWorker({ ledger, connect: syntheticConnect, adapterFor: () => store });
  await worker.run('synthetic', changeSet.jobs[0].id);
  const partialStatus = ledger.getChangeSet(actor, changeSet.id).status;
  const interruptedWorker = createPublicationWorker({ ledger, connect: syntheticConnect, adapterFor: () => ({
    replaceText: (target, input) => {
      store.replaceText(target, input);
      throw Object.assign(new Error('Simulated lost acknowledgement'), { publicationMayHaveOccurred: true });
    },
  }) });
  const interrupted = await interruptedWorker.run('synthetic', changeSet.jobs[1].id);
  ledger.close(); store.close();
  ledger = new Ledger(database); store = new LocalDocumentStore(destination);
  worker = createPublicationWorker({ ledger, connect: syntheticConnect, adapterFor: () => store });
  await worker.reconcile('synthetic', interrupted.id, 'Synthetic reviewer compared persisted destination after restart.');
  await worker.run('synthetic', changeSet.jobs[2].id);
  const complete = ledger.getChangeSet(actor, changeSet.id);
  const backup = await snapshotLedger(database, join(directory, 'backup.sqlite'));
  await restoreLedger(join(directory, 'backup.sqlite'), join(directory, 'restored.sqlite'));
  const cpu = process.cpuUsage(cpuStart);
  console.log(JSON.stringify({ syntheticOnly: true, directory, plannedReviewTasks: plan.tasks.length,
    discoveredCandidates: discovery.candidates.length, partialStatus, interruptionStatus: interrupted.body.status,
    finalStatus: complete.status, publications: complete.jobs.map((job) => ({ status: job.body.status, receipt: job.body.receipt })),
    originalTextsPreserved: artefacts.every((artefact) => ledger.get(actor, artefact.id, 'artefact').body.segments[0].text === 'Notify the incident owner.'),
    backup, restored: verifyLedgerFile(join(directory, 'restored.sqlite')),
    measurements: { elapsedMs: performance.now() - started, cpuMicroseconds: cpu.user + cpu.system,
      ledgerFileBytes: statSync(database).size, modelCalls: 0, networkCalls: 0 },
    caveat: 'Synthetic workflow and local destination only. No live Microsoft access, legal validation or client-document publication occurred.' }, null, 2));
} finally { ledger.close(); store.close(); }
