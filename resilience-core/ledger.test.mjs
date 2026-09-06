import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Ledger, cacheIdentity, discoverLiteralCandidates } from './ledger.mjs';
import { reviewer, editor, span, sourceInput, artefactInput, seed, link } from './fixtures.mjs';

function setup(t) {
  const ledger = new Ledger(); t.after(() => ledger.close());
  return { ledger, ...seed(ledger) };
}
const confirm = (ledger, dependency, revision = 0) => ledger.reviewDependency(reviewer, dependency.id,
  { disposition: 'confirmed', reason: 'Reviewed relationship, not a compliance opinion.', expectedRevision: revision });

test('source/assertion/document evidence remains pinned and immutable', (t) => {
  const { ledger, source, assertion, artefact } = setup(t);
  const dependency = link(ledger, assertion, artefact); confirm(ledger, dependency);
  const updated = ledger.addSource(editor, sourceInput({ expectedVersion: 1, text: 'A changed synthetic rule.' }));
  assert.equal(updated.version, 2);
  assert.equal(ledger.get(reviewer, source.id, 'source').body.text, source.body.text);
  assert.equal(ledger.get(reviewer, dependency.id, 'dependency').body.assertionId, assertion.id);
  assert.equal(ledger.coverage(reviewer, artefact.id).segments[0].confirmedDependencies, 0);
});

test('only a reviewer can approve source-backed assertions', (t) => {
  const { ledger, source } = setup(t);
  assert.throws(() => ledger.addAssertion(editor, { sourceId: source.id }), /Forbidden/);
});

test('invented legal quotation is rejected without partial records/events', (t) => {
  const { ledger, source } = setup(t); const count = ledger.audit(reviewer).length;
  assert.throws(() => ledger.addAssertion(reviewer, { key: 'bad', expectedVersion: 0, sourceId: source.id,
    evidence: span('invented legal words') }), /Invalid source evidence/);
  assert.equal(ledger.list(reviewer, 'assertion').length, 1);
  assert.equal(ledger.audit(reviewer).length, count);
});

test('invalid artefact quote persists as blocked evidence, never silently vanishes', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const dependency = link(ledger, assertion, artefact, span('invented clause'));
  assert.equal(dependency.body.evidenceValid, false);
  assert.equal(ledger.coverage(reviewer, artefact.id).segments[0].blocked, 1);
  assert.throws(() => confirm(ledger, dependency), /Blocked evidence/);
  ledger.reviewDependency(reviewer, dependency.id, { disposition: 'rejected', reason: 'Invalid quote.', expectedRevision: 0 });
  assert.equal(ledger.coverage(reviewer, artefact.id).segments[0].blocked, 0);
});

test('candidate discovery does not produce compliance or review clearance', (t) => {
  const { ledger, artefact } = setup(t);
  const hits = discoverLiteralCandidates(artefact, 'incident owner');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].evidence.quote, 'incident owner');
  assert.deepEqual(discoverLiteralCandidates(artefact, 'nonexistent'), []);
  assert.ok(ledger.coverage(reviewer, artefact.id).segments.every((s) => s.assessment === 'not_assessed'));
});

test('failed, excluded and unknown extraction coverage are explicit', (t) => {
  const { ledger } = setup(t);
  const artefact = ledger.addArtefact(editor, artefactInput({ key: 'failed', inventoryComplete: false,
    segments: [{ id: 'scan', state: 'failed', reason: 'OCR failed' }, { id: 'appendix', state: 'excluded', reason: 'Missing attachment' }] }));
  const report = ledger.coverage(reviewer, artefact.id);
  assert.equal(report.inventoryComplete, false);
  assert.deepEqual(report.segments.map((s) => s.extraction), ['failed', 'excluded']);
  assert.throws(() => ledger.addArtefact(editor, artefactInput({ key: 'empty', segments: [] })), /inventory/);
});

test('confirmed dependency is not equivalent to completed assessment', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const dependency = link(ledger, assertion, artefact); confirm(ledger, dependency);
  const coverage = ledger.coverage(reviewer, artefact.id);
  assert.equal(coverage.segments[0].confirmedDependencies, 1);
  assert.equal(coverage.segments[0].assessment, 'not_assessed');
  assert.equal(coverage.segments[1].confirmedDependencies, 0);
});

test('tenant and matter restrictions apply to reads, writes, coverage and audit', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const stranger = { ...reviewer, tenantId: 'other-firm' };
  const barred = { ...reviewer, matterIds: [] };
  const dependency = link(ledger, assertion, artefact);
  for (const actor of [stranger, barred]) {
    assert.throws(() => ledger.get(actor, artefact.id, 'artefact'), /Record unavailable/);
    assert.throws(() => ledger.coverage(actor, artefact.id), /Record unavailable/);
    assert.throws(() => ledger.reviewDependency(actor, dependency.id, { disposition: 'confirmed', reason: 'x', expectedRevision: 0 }), /Record unavailable/);
    assert.equal(ledger.list(actor, 'artefact').length, 0);
    assert.equal(ledger.audit(actor).filter((event) => event.matter !== null).length, 0);
  }
  assert.throws(() => ledger.addArtefact(barred, artefactInput({ key: 'forbidden' })), /Forbidden/);
});

test('cross-tenant source/dependency references cannot be created', (t) => {
  const { ledger, source, artefact } = setup(t);
  const stranger = { ...reviewer, tenantId: 'other-firm' };
  assert.throws(() => ledger.addAssertion(stranger, { sourceId: source.id }), /Record unavailable/);
  assert.throws(() => ledger.proposeDependency(stranger, { artefactId: artefact.id }), /Record unavailable/);
});

test('reviewer scope revocation prevents reading a previously accessible relationship', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const dependency = link(ledger, assertion, artefact); confirm(ledger, dependency);
  assert.throws(() => ledger.get({ ...reviewer, matterIds: [] }, dependency.id, 'dependency'), /Record unavailable/);
});

test('optimistic review revision rejects lost updates and preserves history', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const dependency = link(ledger, assertion, artefact); confirm(ledger, dependency);
  const count = ledger.audit(reviewer).length;
  assert.throws(() => ledger.reviewDependency(reviewer, dependency.id, { disposition: 'rejected', reason: 'stale decision', expectedRevision: 0 }), /Review conflict/);
  assert.equal(ledger.audit(reviewer).length, count);
  ledger.reviewDependency(reviewer, dependency.id, { disposition: 'rejected', reason: 'Reconsidered.', expectedRevision: 1 });
  assert.equal(ledger.coverage(reviewer, artefact.id).segments[0].confirmedDependencies, 0);
  assert.deepEqual(ledger.audit(reviewer).slice(-2).map((e) => e.action), ['dependency.confirmed', 'dependency.rejected']);
});

test('superseded artefact or source evidence cannot receive new confirmation', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const dependency = link(ledger, assertion, artefact);
  ledger.addArtefact(editor, artefactInput({ expectedVersion: 1 }));
  assert.throws(() => confirm(ledger, dependency), /superseded/);
  assert.throws(() => link(ledger, assertion, artefact), /superseded/);
});

test('duplicate dependency requests cannot create repeated work for the same segment/assertion', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  link(ledger, assertion, artefact);
  assert.throws(() => link(ledger, assertion, artefact), /Version conflict/);
  assert.equal(ledger.list(reviewer, 'dependency').length, 1);
});

test('source-change plan differentiates signed agreements, templates and automated controls', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const original = artefact.body.segments[0].text;
  const signed = ledger.addArtefact(editor, artefactInput({ key: 'signed', type: 'executed' }));
  const control = ledger.addArtefact(editor, artefactInput({ key: 'rule', type: 'control' }));
  for (const item of [artefact, signed, control]) confirm(ledger, link(ledger, assertion, item));
  const changed = ledger.addSource(editor, sourceInput({ expectedVersion: 1, lifecycle: 'uncommenced', text: 'Synthetic future rule.' }));
  const plan = ledger.planSourceChange(reviewer, changed.id);
  assert.deepEqual(plan.tasks.map((task) => task.action).sort(), ['legal_variation_assessment', 'propose_owner_review', 'review_rule_and_test']);
  assert.ok(plan.tasks.every((task) => task.status === 'unreviewed' && task.legalLifecycle === 'uncommenced'));
  assert.equal(plan.discoveryRequired, true);
  assert.equal(ledger.get(reviewer, signed.id, 'artefact').body.segments[0].text, original);
  assert.equal(ledger.planSourceChange({ ...reviewer, matterIds: [] }, changed.id).tasks.length, 0);
});

test('new sources without known edges cannot silently claim no impact', (t) => {
  const { ledger } = setup(t);
  const source = ledger.addSource(editor, sourceInput({ key: 'new-duty' }));
  const plan = ledger.planSourceChange(reviewer, source.id);
  assert.equal(plan.tasks.length, 0); assert.equal(plan.discoveryRequired, true);
});

test('changed artefacts produce relocation tasks rather than old-offset edits', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  confirm(ledger, link(ledger, assertion, artefact));
  const revised = ledger.addArtefact(editor, artefactInput({ expectedVersion: 1, title: 'Revised title' }));
  const source = ledger.addSource(editor, sourceInput({ expectedVersion: 1, text: 'A different rule.' }));
  const task = ledger.planSourceChange(reviewer, source.id).tasks[0];
  assert.equal(task.artefactId, revised.id); assert.equal(task.priorArtefactId, artefact.id);
  assert.equal(task.requiresRelocalisation, true);
});

test('cache identity invalidates every material input and permission scope', () => {
  const input = { artefactHash: 'a', sourceHash: 's', assertionHash: 'r', extractionVersion: 'e',
    modelVersion: 'm', promptVersion: 'p', schemaVersion: 'v', aclVersion: 'acl1', actor: reviewer };
  const base = cacheIdentity(input);
  for (const key of Object.keys(input).filter((key) => key !== 'actor')) assert.notEqual(cacheIdentity({ ...input, [key]: `${input[key]}2` }), base);
  assert.notEqual(cacheIdentity({ ...input, actor: { ...reviewer, matterIds: [] } }), base);
  assert.notEqual(cacheIdentity({ ...input, actor: { ...reviewer, userId: 'other' } }), base);
  assert.throws(() => cacheIdentity({ ...input, aclVersion: '' }), /Required/);
  assert.equal(cacheIdentity({ ...input, actor: { ...reviewer, matterIds: ['b', 'a'] } }), cacheIdentity({ ...input, actor: { ...reviewer, matterIds: ['a', 'b', 'a'] } }));
});

test('persistent ledger survives restart; separate writers detect version conflicts', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'larp-ledger-test-')); t.after(() => rmSync(dir, { recursive: true }));
  const path = join(dir, 'ledger.sqlite'); let ledger = new Ledger(path);
  const { assertion, artefact } = seed(ledger); confirm(ledger, link(ledger, assertion, artefact));
  ledger.close(); ledger = new Ledger(path); const second = new Ledger(path);
  try {
    assert.equal(ledger.coverage(reviewer, artefact.id).segments[0].confirmedDependencies, 1);
    ledger.addSource(editor, sourceInput({ expectedVersion: 1, text: 'Next version' }));
    assert.throws(() => second.addSource(editor, sourceInput({ expectedVersion: 1, text: 'Conflicting version' })), /Version conflict/);
    assert.equal(second.list(reviewer, 'source').length, 2);
    const raw = new DatabaseSync(path);
    try { assert.throws(() => raw.exec('DELETE FROM events'), /Append-only/); }
    finally { raw.close(); }
  } finally { second.close(); ledger.close(); }
});

test('calendar validation rejects impossible effective dates', (t) => {
  const { ledger } = setup(t);
  assert.throws(() => ledger.addSource(editor, sourceInput({ key: 'invalid-date', effectiveDate: '2026-02-30' })), /Invalid effective date/);
  assert.equal(ledger.list(reviewer, 'source').length, 1);
});

test('global event and decision sequences do not expose hidden activity counts', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const decision = confirm(ledger, link(ledger, assertion, artefact));
  assert.equal('id' in decision, false);
  assert.ok(ledger.audit(reviewer).every((event) => !('id' in event)));
});

test('unknown future schemas are refused without changing the database', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'larp-schema-test-')); t.after(() => rmSync(dir, { recursive: true }));
  const path = join(dir, 'future.sqlite'); const raw = new DatabaseSync(path);
  raw.exec('PRAGMA user_version=99'); raw.close();
  assert.throws(() => new Ledger(path), /Unsupported/);
  const check = new DatabaseSync(path);
  try { assert.equal(check.prepare('PRAGMA user_version').get().user_version, 99); }
  finally { check.close(); }
});

test('blocked evidence can be corrected as a reviewed new version without losing history', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const blocked = link(ledger, assertion, artefact, span('wrong quote'));
  const corrected = ledger.proposeDependency(editor, { artefactId: artefact.id, assertionId: assertion.id,
    segmentId: artefact.body.segments[0].id, evidence: span(artefact.body.segments[0].text),
    rationale: 'Corrected source span.', discovery: 'manual', expectedVersion: 1 });
  assert.equal(corrected.version, 2);
  assert.throws(() => confirm(ledger, blocked), /superseded/);
  confirm(ledger, corrected);
  const report = ledger.coverage(reviewer, artefact.id);
  assert.equal(report.segments[0].blocked, 0);
  assert.equal(report.segments[0].confirmedDependencies, 1);
  assert.equal(ledger.get(reviewer, blocked.id, 'dependency').body.evidenceValid, false);
});

const assessmentInput = (assertion, artefact, overrides = {}) => ({
  assertionId: assertion.id, artefactId: artefact.id, segmentId: artefact.body.segments[0].id,
  finding: 'potential_gap', mode: 'current_review', severity: 'medium',
  rationale: 'Synthetic wording requires review against the recorded expectation.',
  applicability: 'Applies only to the synthetic incident workflow.',
  limitations: [], contextComplete: true, evidence: span(artefact.body.segments[0].text), ...overrides,
});
const approveAssessment = (ledger, assessment, expectedRevision = 0) => ledger.reviewAssessment(reviewer, assessment.id,
  { disposition: 'approved', reason: 'Reviewed the scoped interpretation and evidence.', expectedRevision });

test('assessment proposals remain unreviewed until a qualified scoped review', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const assessment = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact));
  assert.equal(ledger.getAssessment(reviewer, assessment.id).workflow, 'unreviewed');
  assert.throws(() => ledger.reviewAssessment(editor, assessment.id, { disposition: 'approved', reason: 'x', expectedRevision: 0 }), /Forbidden/);
  const reviewed = approveAssessment(ledger, assessment);
  assert.equal(reviewed.workflow, 'approved');
  assert.equal(reviewed.decision.actor, reviewer.userId);
  assert.equal(reviewed.body.proposedBy, editor.userId);
  assert.equal(reviewed.body.sourceId, assertion.body.sourceId);
  assert.equal(reviewed.body.method, 'manual');
});

test('an approved no-impact finding only covers its named assertion and segment', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const assessment = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact, { finding: 'no_material_impact_in_scope', severity: 'informational' }));
  approveAssessment(ledger, assessment);
  const report = ledger.coverage(reviewer, artefact.id);
  assert.equal(report.segments[0].scopedFindings[0].finding, 'no_material_impact_in_scope');
  assert.equal(report.segments[0].scopedFindings[0].workflow, 'approved');
  assert.equal(report.segments[0].scopedFindings[0].assertionId, assertion.id);
  assert.equal(report.segments[1].assessment, 'not_assessed');
  assert.match(report.caveat, /missing scopes/);
});

test('incomplete extraction, missing context and limitations block no-impact approval', (t) => {
  const { ledger, assertion } = setup(t);
  const cases = [
    { artefact: { inventoryComplete: false }, assessment: {} },
    { artefact: { segments: [...artefactInput().segments, { id: 'scan', state: 'failed', reason: 'OCR failed' }] }, assessment: {} },
    { artefact: {}, assessment: { contextComplete: false } },
    { artefact: {}, assessment: { limitations: ['Referenced handbook unavailable'] } },
  ];
  cases.forEach((item, index) => {
    const artefact = ledger.addArtefact(editor, artefactInput({ key: `incomplete-${index}`, ...item.artefact }));
    const assessment = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact, { finding: 'no_material_impact_in_scope', ...item.assessment }));
    assert.equal(ledger.getAssessment(reviewer, assessment.id).workflow, 'blocked');
    assert.throws(() => approveAssessment(ledger, assessment), /Blocked assessment/);
    assert.equal(ledger.coverage(reviewer, artefact.id).segments[0].scopedFindings[0].workflow, 'blocked');
  });
});

test('invalid assessment quotations persist visibly and cannot be approved', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const assessment = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact, { evidence: span('Invented words') }));
  assert.equal(ledger.getAssessment(reviewer, assessment.id).workflow, 'blocked');
  assert.throws(() => approveAssessment(ledger, assessment), /Blocked assessment/);
});

test('reviewers can acknowledge missing evidence without inventing a quotation or clearing coverage', (t) => {
  const { ledger, assertion } = setup(t);
  const artefact = ledger.addArtefact(editor, artefactInput({ key: 'unreadable', inventoryComplete: false,
    segments: [{ id: 'page', state: 'failed', reason: 'Unreadable scan' }] }));
  const assessment = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact, {
    finding: 'insufficient_evidence', evidence: null, contextComplete: false, limitations: ['Source scan could not be extracted.'],
  }));
  const approved = approveAssessment(ledger, assessment);
  assert.equal(approved.body.finding, 'insufficient_evidence');
  const report = ledger.coverage(reviewer, artefact.id);
  assert.equal(report.inventoryComplete, false);
  assert.equal(report.segments[0].extraction, 'failed');
  assert.equal(report.segments[0].scopedFindings[0].finding, 'insufficient_evidence');
  assert.throws(() => ledger.proposeAssessment(editor, assessmentInput(assertion, artefact, { finding: 'insufficient_evidence', evidence: null })), /requires a limitation/);
});

test('future-law readiness and legal lifecycle remain distinct from reviewer approval', (t) => {
  const { ledger, artefact } = setup(t);
  const source = ledger.addSource(editor, sourceInput({ key: 'future', lifecycle: 'uncommenced' }));
  const assertion = ledger.addAssertion(reviewer, { key: 'future-rule', expectedVersion: 0, sourceId: source.id,
    interpretation: 'Synthetic future requirement.', applicability: 'Readiness only.', exceptions: 'No operative duty yet.', evidence: span(source.body.text) });
  assert.throws(() => ledger.proposeAssessment(editor, assessmentInput(assertion, artefact)), /Future sources require readiness/);
  const assessment = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact, { mode: 'readiness' }));
  const approved = approveAssessment(ledger, assessment);
  assert.equal(approved.workflow, 'approved');
  assert.equal(approved.body.mode, 'readiness');
  assert.equal(approved.body.legalLifecycle, 'uncommenced');
});

test('source, assertion or artefact updates invalidate assessment approval without erasing the decision', (t) => {
  for (const kind of ['source', 'assertion', 'artefact']) {
    const ledger = new Ledger(); t.after(() => ledger.close());
    const { source, assertion, artefact } = seed(ledger);
    const assessment = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact));
    approveAssessment(ledger, assessment);
    if (kind === 'source') ledger.addSource(editor, sourceInput({ expectedVersion: 1, text: 'Changed source.' }));
    if (kind === 'artefact') ledger.addArtefact(editor, artefactInput({ expectedVersion: 1 }));
    if (kind === 'assertion') ledger.addAssertion(reviewer, { key: 'escalation-duty', expectedVersion: 1, sourceId: source.id,
      evidence: span(source.body.text), interpretation: 'Revised interpretation.', applicability: 'Changed facts.', exceptions: 'Reviewed exceptions.' });
    const view = ledger.getAssessment(reviewer, assessment.id);
    assert.equal(view.workflow, 'review_required', kind);
    assert.equal(view.decision.disposition, 'approved', kind);
    assert.equal(view.stale, true, kind);
    assert.throws(() => approveAssessment(ledger, assessment, 1), /superseded/);
  }
});

test('corrected assessment versions require fresh review and retain prior evidence', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const original = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact, { evidence: span('wrong') }));
  const revised = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact, { expectedVersion: 1 }));
  assert.equal(ledger.getAssessment(reviewer, revised.id).workflow, 'unreviewed');
  assert.equal(ledger.getAssessment(reviewer, original.id).workflow, 'review_required');
  assert.throws(() => approveAssessment(ledger, original), /superseded/);
  approveAssessment(ledger, revised);
  assert.equal(ledger.getAssessment(reviewer, original.id).body.evidence.quote, 'wrong');
  assert.equal(ledger.coverage(reviewer, artefact.id).segments[0].scopedFindings.length, 1);
});

test('assessments cannot cross tenant or matter boundaries', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const assessment = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact));
  for (const actor of [{ ...reviewer, tenantId: 'another-firm' }, { ...reviewer, matterIds: [] }]) {
    assert.throws(() => ledger.proposeAssessment(actor, assessmentInput(assertion, artefact)), /Record unavailable/);
    assert.throws(() => ledger.getAssessment(actor, assessment.id), /Record unavailable/);
    assert.throws(() => ledger.reviewAssessment(actor, assessment.id, { disposition: 'approved', reason: 'x', expectedRevision: 0 }), /Record unavailable/);
    assert.equal(ledger.list(actor, 'assessment').length, 0);
    assert.equal(ledger.audit(actor).filter((event) => event.action.startsWith('assessment.')).length, 0);
  }
});

test('assessment review conflicts are atomic and rejection does not count as approval', (t) => {
  const { ledger, assertion, artefact } = setup(t);
  const assessment = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact));
  approveAssessment(ledger, assessment); const count = ledger.audit(reviewer).length;
  assert.throws(() => ledger.reviewAssessment(reviewer, assessment.id, { disposition: 'rejected', reason: 'stale reviewer', expectedRevision: 0 }), /Review conflict/);
  assert.equal(ledger.audit(reviewer).length, count);
  ledger.reviewAssessment(reviewer, assessment.id, { disposition: 'rejected', reason: 'Incorrect applicability.', expectedRevision: 1 });
  assert.equal(ledger.coverage(reviewer, artefact.id).segments[0].scopedFindings[0].workflow, 'rejected');
  assert.deepEqual(ledger.audit(reviewer).slice(-2).map((event) => event.action), ['assessment.approved', 'assessment.rejected']);
});

test('unknown scopes and global compliance labels are rejected before writing', (t) => {
  const { ledger, assertion, artefact } = setup(t); const count = ledger.audit(reviewer).length;
  assert.throws(() => ledger.proposeAssessment(editor, assessmentInput(assertion, artefact, { segmentId: 'invented' })), /Unknown assessment segment/);
  assert.throws(() => ledger.proposeAssessment(editor, assessmentInput(assertion, artefact, { finding: 'compliant' })), /Invalid finding/);
  assert.equal(ledger.audit(reviewer).length, count);
  assert.equal(ledger.list(reviewer, 'assessment').length, 0);
});

test('assessment evidence and review decision survive restart', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'larp-assessment-test-')); t.after(() => rmSync(dir, { recursive: true }));
  const path = join(dir, 'ledger.sqlite'); let ledger = new Ledger(path);
  const { assertion, artefact } = seed(ledger);
  const assessment = ledger.proposeAssessment(editor, assessmentInput(assertion, artefact));
  approveAssessment(ledger, assessment); ledger.close(); ledger = new Ledger(path);
  try {
    const view = ledger.getAssessment(reviewer, assessment.id);
    assert.equal(view.workflow, 'approved');
    assert.equal(view.body.evidence.quote, artefact.body.segments[0].text);
    assert.equal(view.decision.revision, 1);
  } finally { ledger.close(); }
});
