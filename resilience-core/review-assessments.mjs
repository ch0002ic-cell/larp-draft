// Console operations reuse the authenticated runtime; request data never supplies an actor.
export const assessmentActions = new Set(['assessment-catalog', 'assessment-context', 'assessment-save',
  'assessment-view', 'assessment-review', 'draft-change']);
const latest = (records) => {
  const byKey = new Map();
  for (const record of records) {
    const previous = byKey.get(record.logical_key);
    if (!previous || record.version > previous.version) byKey.set(record.logical_key, record);
  }
  return [...byKey.values()];
};
const summary = ({ id, version, matter, body }) => ({ id, version, matter,
  title: body.title ?? body.interpretation, sourceId: body.sourceId });
export async function executeAssessmentAction(runtime, credential, input) {
  const execute = (operation, ...args) => runtime.execute(credential, operation, ...args);
  if (input.action === 'assessment-catalog') {
    const artefacts = latest(await execute('list', 'artefact'));
    const assertions = latest(await execute('list', 'assertion'));
    const assessments = latest(await execute('list', 'assessment'));
    if ([artefacts, assertions, assessments].some((records) => records.length > 250)) throw new Error('Review catalogue budget exceeded');
    return { artefacts: artefacts.map(summary), assertions: assertions.map(summary),
      assessments: assessments.map(({ id, version, body }) => ({ id, version, artefactId: body.artefactId,
        assertionId: body.assertionId, segmentId: body.segmentId, finding: body.finding })) };
  }
  if (input.action === 'assessment-context' || input.action === 'assessment-view') {
    const assessment = input.action === 'assessment-view' ? await execute('getAssessment', input.id) : null;
    const artefact = await execute('get', assessment?.body.artefactId ?? input.artefactId, 'artefact');
    const assertion = await execute('get', assessment?.body.assertionId ?? input.assertionId, 'assertion');
    const source = await execute('get', assertion.body.sourceId, 'source');
    const coverage = await execute('coverage', artefact.id);
    const previous = latest(await execute('list', 'assessment')).filter((record) => record.body.artefactId === artefact.id
      && record.body.assertionId === assertion.id).map(({ id, version, body }) => ({ id, version, segmentId: body.segmentId }));
    return { assessment, artefact, assertion, source, coverage, previous };
  }
  if (input.action === 'assessment-save') {
    const record = await execute('proposeAssessment', { artefactId: input.artefactId, assertionId: input.assertionId,
      segmentId: input.segmentId, finding: input.finding, mode: input.mode, severity: input.severity,
      rationale: input.rationale, applicability: input.applicability, evidence: input.evidence,
      contextComplete: input.contextComplete, limitations: input.limitations, expectedVersion: input.expectedVersion });
    return execute('getAssessment', record.id);
  }
  if (input.action === 'assessment-review') return execute('reviewAssessment', input.id,
    { disposition: input.disposition, reason: input.reason, expectedRevision: input.expectedRevision });
  if (input.action === 'draft-change') return execute('proposeChangeSet', { key: input.key, title: input.title,
    rationale: input.rationale, reviewExpiresAt: input.reviewExpiresAt,
    items: [{ assessmentId: input.assessmentId, replacement: input.replacement }] });
  throw new Error('Unsupported assessment action');
}
