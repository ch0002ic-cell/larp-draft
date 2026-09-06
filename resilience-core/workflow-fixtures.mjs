import { reviewer, sourceInput, span, artefactInput } from './fixtures.mjs';

export const syntheticActor = { ...reviewer, userId: 'synthetic-owner' };
export function syntheticConnect() {
  return { identity: { subject: syntheticActor.userId, tenantId: syntheticActor.tenantId, expiresAt: Date.now() + 60000 },
    access: { ...syntheticActor, subject: syntheticActor.userId, active: true } };
}

export function approvedAssessment(ledger, assertion, artefact, replacement, options = {}) {
  const assessment = ledger.proposeAssessment(syntheticActor, {
    artefactId: artefact.id, assertionId: assertion.id, segmentId: artefact.body.segments[0].id,
    evidence: span(artefact.body.segments[0].text), finding: 'potential_conflict', mode: 'current_review',
    severity: 'medium', contextComplete: true, limitations: [],
    rationale: 'Synthetic maintenance exercise; not a legal conclusion.', applicability: 'Synthetic files only.',
    ...options,
  });
  ledger.reviewAssessment(syntheticActor, assessment.id, { disposition: 'approved', reason: 'Synthetic review.', expectedRevision: 0 });
  return { assessmentId: assessment.id, replacement };
}

export function prepareWorkflow(ledger, store, count = 2) {
  const source = ledger.addSource(syntheticActor, sourceInput({ text: 'Synthetic rule: notify owner and record acknowledgement.' }));
  const assertion = ledger.addAssertion(syntheticActor, { key: 'synthetic-reviewed-rule', expectedVersion: 0,
    sourceId: source.id, evidence: span(source.body.text), interpretation: 'Synthetic acknowledgement expectation.',
    applicability: 'Synthetic fixtures only.', exceptions: 'Not Singapore law.' });
  const artefacts = [];
  const items = Array.from({ length: count }, (_, index) => {
    const target = { matterId: syntheticActor.matterIds[0], driveId: 'synthetic-drive', folderId: 'synthetic-folder', itemId: `item-${index}` };
    const text = 'Notify the incident owner.';
    const remote = store.seed(target, text);
    const artefact = ledger.addArtefact(syntheticActor, artefactInput({ key: `workflow-${index}`,
      owner: syntheticActor.userId, type: ['template', 'checklist', 'playbook'][index % 3],
      segments: [{ id: 'document', state: 'available', text }],
      provenance: { remote: { ...target, eTag: remote.eTag, hash: remote.hash } } }));
    artefacts.push(artefact);
    return approvedAssessment(ledger, assertion, artefact, 'Notify the incident owner and record acknowledgement.');
  });
  const changeSet = ledger.proposeChangeSet(syntheticActor, { key: 'synthetic-change', title: 'Synthetic maintenance cycle',
    rationale: 'Exercise reviewed propagation across artefact types.', reviewExpiresAt: new Date(Date.now() + 3600000).toISOString(), items });
  return { source, assertion, artefacts, changeSet };
}

export function approveWorkflow(ledger, changeSet) {
  ledger.reviewChangeSet(syntheticActor, changeSet.id, { disposition: 'approved', reason: 'Synthetic legal review.', expectedRevision: 0 });
  changeSet.body.items.forEach((_, index) => ledger.reviewOwnership(syntheticActor, changeSet.id,
    { index, disposition: 'approved', reason: 'Synthetic owner approval.', expectedVersion: 0 }));
}
