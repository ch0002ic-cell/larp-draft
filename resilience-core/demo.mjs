import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Ledger, discoverLiteralCandidates } from './ledger.mjs';
import { reviewer, editor, seed, link, span, artefactInput, sourceInput } from './fixtures.mjs';

const supplied = process.argv.slice(2);
if (supplied.length > 1) throw new Error('Usage: node resilience-core/demo.mjs [new-database-path]');
const database = supplied[0] ? resolve(supplied[0]) : join(mkdtempSync(join(tmpdir(), 'larp-resilience-demo-')), 'ledger.sqlite');
if (existsSync(database)) throw new Error('Demo requires a new database path; existing files are never overwritten.');
const ledger = new Ledger(database);
try {
  const { source, assertion, artefact } = seed(ledger);
  const checklist = ledger.addArtefact(editor, artefactInput({ key: 'checklist', title: 'Synthetic incident checklist', type: 'checklist' }));
  const executed = ledger.addArtefact(editor, artefactInput({ key: 'executed', title: 'Synthetic signed agreement', type: 'executed' }));
  const scanned = ledger.addArtefact(editor, artefactInput({ key: 'scan', title: 'Synthetic unparsed scan', type: 'playbook', inventoryComplete: false,
    segments: [{ id: 'page-1', state: 'failed', reason: 'OCR not implemented in this foundation.' }] }));
  const lexicalCandidates = discoverLiteralCandidates(artefact, 'incident owner');
  for (const item of [artefact, checklist, executed]) {
    const dependency = link(ledger, assertion, item);
    ledger.reviewDependency(reviewer, dependency.id, { disposition: 'confirmed', reason: 'Demo reviewer confirms relationship only.', expectedRevision: 0 });
  }
  const assessment = ledger.proposeAssessment(editor, {
    artefactId: artefact.id, assertionId: assertion.id, segmentId: 'clause-1',
    finding: 'no_material_impact_in_scope', mode: 'current_review', severity: 'informational',
    evidence: span(artefact.body.segments[0].text), contextComplete: true, limitations: [],
    rationale: 'The selected synthetic clause matches this version of the synthetic expectation.',
    applicability: 'Only demo.1 and clause-1; no conclusion about other clauses or real law.',
  });
  const assessmentBeforeChange = ledger.reviewAssessment(reviewer, assessment.id, {
    disposition: 'approved', reason: 'Synthetic reviewer agrees with this limited assessment.', expectedRevision: 0,
  });
  const gap = ledger.proposeAssessment(editor, {
    artefactId: scanned.id, assertionId: assertion.id, segmentId: 'page-1',
    finding: 'insufficient_evidence', mode: 'current_review', severity: 'medium',
    evidence: null, contextComplete: false, limitations: ['The scan has not been extracted.'],
    rationale: 'The relevant wording cannot be inspected.', applicability: 'Possible demo workflow dependency remains unresolved.',
  });
  ledger.reviewAssessment(reviewer, gap.id, {
    disposition: 'approved', reason: 'Acknowledged missing evidence; this does not clear the scan.', expectedRevision: 0,
  });
  const beforeChange = ledger.coverage(reviewer, artefact.id);
  const changedSource = ledger.addSource(editor, sourceInput({ expectedVersion: source.version, text: 'Notify the designated incident owner and record acknowledgement.' }));
  const plan = ledger.planSourceChange(reviewer, changedSource.id);
  console.log(JSON.stringify({ syntheticOnly: true, database, lexicalCandidates,
    assessmentBeforeChange, assessmentAfterChange: ledger.getAssessment(reviewer, assessment.id),
    dependencyCoverageBeforeChange: beforeChange, dependencyCoverageAfterChange: ledger.coverage(reviewer, artefact.id),
    failedExtraction: ledger.coverage(reviewer, scanned.id), plan,
    auditEvents: ledger.audit(reviewer).length,
    nextStep: 'Review changed assertions and applicability; no source artefacts or application files were edited.' }, null, 2));
} finally { ledger.close(); }
