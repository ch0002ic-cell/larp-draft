import test from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from './ledger.mjs';
import { LocalDocumentStore } from './local-document-store.mjs';
import { prepareWorkflow, syntheticActor } from './workflow-fixtures.mjs';
import { sourceInput } from './fixtures.mjs';
import { executeAssessmentAction } from './review-assessments.mjs';
import { evidenceSelection } from './review-ui/evidence-selection.mjs';
function setup(t) {
  const ledger = new Ledger(':memory:'), store = new LocalDocumentStore();
  const data = prepareWorkflow(ledger, store); let actor = syntheticActor;
  t.after(() => { ledger.close(); store.close(); });
  const runtime = { execute: async (_token, operation, ...args) => ledger[operation](actor, ...args) };
  const execute = (input) => executeAssessmentAction(runtime, 'verified-test-credential', input);
  const proposal = { action: 'assessment-save', artefactId: data.artefacts[0].id, assertionId: data.assertion.id,
    segmentId: 'document', expectedVersion: 1, finding: 'potential_conflict', mode: 'current_review', severity: 'medium',
    rationale: 'Synthetic assessment reasoning', applicability: 'Synthetic fixture only', contextComplete: true, limitations: [],
    evidence: { start: 0, end: 'Notify the incident owner.'.length, quote: 'Notify the incident owner.' } };
  return { ledger, data, execute, proposal, as: (next) => { actor = next; } };
}
test('assessment authoring creates a new reviewable version and requires approval before preparing a change', async (t) => {
  const { execute, proposal } = setup(t);
  const catalog = await execute({ action: 'assessment-catalog' }); assert.equal(catalog.artefacts.length, 2);
  const record = await execute(proposal); assert.equal(record.workflow, 'unreviewed'); assert.equal(record.version, 2);
  const draft = { action: 'draft-change', key: 'new-reviewed-change', assessmentId: record.id, title: 'Proposed update',
    rationale: 'Synthetic maintenance', replacement: 'Notify the incident owner and obtain acknowledgement.', reviewExpiresAt: new Date(Date.now() + 60000).toISOString() };
  await assert.rejects(execute(draft), /Approved actionable/);
  await execute({ action: 'assessment-review', id: record.id, disposition: 'approved', reason: 'Reviewed synthetic evidence', expectedRevision: 0 });
  const change = await execute(draft); assert.equal(change.status, 'unreviewed'); assert.equal(change.jobs[0].body.status, 'queued');
  await assert.rejects(execute(proposal), /Version conflict/);
  await assert.rejects(execute({ action: 'assessment-review', id: record.id, disposition: 'approved', reason: 'Conflicting review', expectedRevision: 0 }), /Review conflict/);
});
test('authoring preserves actor and matter boundaries and ignores actor injection', async (t) => {
  const { execute, proposal, as } = setup(t);
  as({ ...syntheticActor, roles: ['reader'] });
  await assert.rejects(execute({ ...proposal, actor: syntheticActor }), /Forbidden/);
  as({ ...syntheticActor, matterIds: [] });
  const catalog = await execute({ action: 'assessment-catalog' }); assert.equal(catalog.artefacts.length, 0);
  await assert.rejects(execute({ ...proposal, action: 'assessment-context' }), /Record unavailable/);
});
test('invalid anchors and incomplete no-impact reviews cannot be approved', async (t) => {
  const { execute, proposal } = setup(t);
  const invalid = await execute({ ...proposal, evidence: { start: 0, end: 3, quote: 'invented' } });
  assert.equal(invalid.workflow, 'blocked');
  await assert.rejects(execute({ action: 'assessment-review', id: invalid.id, disposition: 'approved', reason: 'Invalid', expectedRevision: 0 }), /Blocked assessment/);
  const noImpact = await execute({ ...proposal, expectedVersion: 2, finding: 'no_material_impact_in_scope', contextComplete: false });
  assert.equal(noImpact.workflow, 'blocked');
  const gap = await execute({ ...proposal, expectedVersion: 3, finding: 'insufficient_evidence', evidence: null, limitations: ['Obtain referenced notice'], contextComplete: false });
  assert.equal(gap.workflow, 'unreviewed'); assert.equal(gap.body.evidence, null);
});
test('changed source evidence invalidates authoring inputs', async (t) => {
  const { execute, proposal, ledger, data } = setup(t);
  const context = await execute({ action: 'assessment-context', artefactId: proposal.artefactId, assertionId: proposal.assertionId });
  assert.equal(context.previous[0].version, 1);
  ledger.addSource(syntheticActor, sourceInput({ key: data.source.logical_key, expectedVersion: 1, text: 'Revised synthetic source' }));
  await assert.rejects(execute(proposal), /Evidence version superseded/);
});
test('textarea evidence selection maps repeated wording, CRLF, CR and Unicode to original offsets', () => {
  const text = 'First\r\n😀 same\rsame';
  const normalised = text.replace(/\r\n?/g, '\n');
  const start = normalised.lastIndexOf('same');
  const selected = evidenceSelection(text, start, start + 4);
  assert.equal(selected.start, text.lastIndexOf('same')); assert.equal(selected.quote, 'same');
  assert.equal(evidenceSelection(text, 0, normalised.length).quote, text);
  for (const [a, b] of [[0, 0], [-1, 2], [0, normalised.length + 1], [1.5, 3]]) assert.throws(() => evidenceSelection(text, a, b));
});
