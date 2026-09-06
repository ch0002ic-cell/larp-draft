// Entirely synthetic: these rules are NOT statements of Singapore law.
export const reviewer = { tenantId: 'demo-firm', userId: 'legal-reviewer', roles: ['reviewer'], matterIds: ['demo-matter'] };
export const editor = { ...reviewer, userId: 'analyst', roles: ['editor'] };
export const span = (text) => ({ start: 0, end: text.length, quote: text });
export const sourceInput = (overrides = {}) => ({ key: 'synthetic-escalation', expectedVersion: 0,
  title: 'Synthetic escalation policy', jurisdiction: 'TEST ONLY', provision: 'demo.1',
  locator: 'urn:larp:synthetic:escalation', lifecycle: 'guidance', effectiveDate: null,
  retrievedAt: '2026-09-06T00:00:00.000Z', text: 'Notify the designated incident owner promptly.', ...overrides });
export const artefactInput = (overrides = {}) => ({ key: 'template', expectedVersion: 0,
  matterId: 'demo-matter', title: 'Synthetic service template', owner: 'knowledge-owner', type: 'template',
  extractionVersion: 'synthetic-v1', inventoryComplete: true,
  segments: [{ id: 'clause-1', state: 'available', text: 'Notify the designated incident owner promptly.' },
    { id: 'clause-2', state: 'available', text: 'Fees are agreed separately.' }], ...overrides });

export function seed(ledger) {
  const source = ledger.addSource(editor, sourceInput());
  const assertion = ledger.addAssertion(reviewer, { key: 'escalation-duty', expectedVersion: 0,
    sourceId: source.id, interpretation: 'Synthetic escalation expectation for the example workflow.',
    applicability: 'Only the synthetic demo artefacts.', exceptions: 'No real legal application.', evidence: span(source.body.text) });
  const artefact = ledger.addArtefact(editor, artefactInput());
  return { source, assertion, artefact };
}
export function link(ledger, assertion, artefact, evidence = span(artefact.body.segments[0].text)) {
  return ledger.proposeDependency(editor, { artefactId: artefact.id, assertionId: assertion.id,
    segmentId: artefact.body.segments[0].id, evidence, rationale: 'Synthetic explicit wording dependency; review required.', discovery: 'manual' });
}
