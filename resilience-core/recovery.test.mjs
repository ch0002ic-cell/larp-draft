import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Ledger } from './ledger.mjs';
import { LocalDocumentStore } from './local-document-store.mjs';
import { snapshotLedger, restoreLedger, verifyLedgerFile } from './recovery.mjs';
import { prepareWorkflow, approveWorkflow, syntheticActor as actor } from './workflow-fixtures.mjs';

test('WAL backup and restore retain approvals and interrupted work without overwriting files', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'larp-backup-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, 'source.sqlite'); const saved = join(dir, 'saved.sqlite'); const restored = join(dir, 'restored.sqlite');
  const ledger = new Ledger(source); const store = new LocalDocumentStore();
  try {
    const { changeSet } = prepareWorkflow(ledger, store);
    approveWorkflow(ledger, changeSet);
    const running = ledger.claimPublication(actor, changeSet.jobs[0].id);
    const snapshot = await snapshotLedger(source, saved);
    assert.equal(snapshot.integrity, 'ok');
    assert.equal(statSync(saved).mode & 0o777, 0o600);
    await assert.rejects(snapshotLedger(source, saved), /EEXIST/);
    await restoreLedger(saved, restored);
    assert.deepEqual(verifyLedgerFile(restored), verifyLedgerFile(saved));
    const recovered = new Ledger(restored);
    try {
      assert.equal(recovered.getChangeSet(actor, changeSet.id).decision.disposition, 'approved');
      assert.equal(recovered.get(actor, running.id, 'publication').body.status, 'running');
      assert.throws(() => recovered.claimPublication(actor, running.id), /reconciliation/);
    } finally { recovered.close(); }
  } finally { ledger.close(); store.close(); }
});
