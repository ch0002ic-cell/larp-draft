import { evidenceSelection } from './evidence-selection.js';
export async function assessmentWorkspace({ api, run, el, button, root, queue, openChange }) {
  const catalog = await api({ action: 'assessment-catalog' });
  queue.replaceChildren(); root.replaceChildren();
  let counter = 0;
  function field(parent, label, tag = 'textarea', options) {
    const caption = el('label', label, parent), input = el(tag, '', parent);
    input.id = `assessment-field-${counter++}`; caption.htmlFor = input.id;
    if (tag === 'select') for (const [value, title] of options) { const option = el('option', title, input); option.value = value; }
    if (tag === 'textarea' || tag === 'input') input.maxLength = 2000;
    return input;
  }
  function sourceEvidence(parent, context) {
    const details = el('details', '', parent); details.open = true;
    el('summary', 'Legal source and assertion', details);
    el('h3', context.source.body.title, details);
    el('p', `${context.source.body.lifecycle} · ${context.source.body.locator}`, details);
    el('pre', context.assertion.body.evidence.quote, details);
    el('p', context.assertion.body.interpretation, details);
    el('p', `Applicability: ${context.assertion.body.applicability}`, details);
    el('p', `Exceptions: ${context.assertion.body.exceptions}`, details);
    el('h3', context.artefact.body.title, parent);
    el('p', `Document version ${context.artefact.version} · owner ${context.artefact.body.owner} · ${context.artefact.body.inventoryComplete ? 'Complete supplied extraction inventory' : 'Extraction review required'}`, parent);
  }
  async function showAssessment(id) {
    const context = await api({ action: 'assessment-view', id }), record = context.assessment;
    root.replaceChildren(); el('h2', 'Assessment review', root);
    el('p', `Assessment status: ${record.workflow.replaceAll('_', ' ')} · version ${record.version}`, root);
    sourceEvidence(root, context);
    el('h3', record.body.finding.replaceAll('_', ' '), root);
    el('pre', record.body.evidence?.quote ?? 'No passage selected; evidence investigation required.', root);
    el('p', record.body.rationale, root); el('p', `Application to this document: ${record.body.applicability}`, root);
    el('p', `Review mode: ${record.body.mode.replaceAll('_', ' ')} · severity: ${record.body.severity} · context: ${record.body.contextComplete ? 'confirmed complete' : 'requires investigation'}`, root);
    for (const issue of [...record.body.limitations, ...record.body.blockers]) el('p', issue, root).className = 'warning';
    if (record.decision) el('p', `Reviewer decision: ${record.decision.disposition} — ${record.decision.reason}`, root);
    const reason = field(root, 'Assessment review reason');
    for (const disposition of ['approved', 'rejected']) button(root, disposition === 'approved' ? 'Approve assessment' : 'Reject assessment', async () => {
      if (!reason.value.trim()) throw new Error('Enter a reason for this decision.');
      await api({ action: 'assessment-review', id, disposition, reason: reason.value, expectedRevision: record.decision?.revision ?? 0 });
      await showAssessment(id);
    });
    const actionable = ['potential_conflict', 'potential_gap', 'stale_reference'].includes(record.body.finding);
    if (record.workflow === 'approved' && actionable && record.body.mode === 'current_review') {
      const panel = el('section', '', root); el('h3', 'Prepare a proposed revision', panel);
      el('p', 'The replacement applies to the assessed passage. Legal and owner approval of the change set are still required before publication.', panel);
      const replacement = field(panel, 'Replacement wording'), title = field(panel, 'Change-set title', 'input');
      const rationale = field(panel, 'Change-set rationale'), expiry = field(panel, 'Review expiry', 'input'); expiry.type = 'datetime-local';
      const key = crypto.randomUUID();
      button(panel, 'Create change set', async () => {
        if (![replacement, title, rationale, expiry].every((input) => input.value.trim())) throw new Error('Complete the proposed wording, title, rationale and review expiry.');
        const date = new Date(expiry.value);
        if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new Error('Choose a future review expiry.');
        const change = await api({ action: 'draft-change', key, assessmentId: id, replacement: replacement.value,
          title: title.value, rationale: rationale.value, reviewExpiresAt: date.toISOString() });
        await openChange(change.id);
      });
    }
    button(root, 'Return to assessments', () => assessmentWorkspace({ api, run, el, button, root, queue, openChange }));
  }
  el('h2', 'Assess document evidence', root);
  el('p', 'Choose a document and reviewed assertion. Record the passage, application and reasoning before requesting a legal decision.', root);
  for (const assessment of catalog.assessments) {
    const doc = catalog.artefacts.find((record) => record.id === assessment.artefactId);
    button(queue, `${doc?.title ?? 'Earlier document version'} · ${assessment.finding.replaceAll('_', ' ')} · v${assessment.version}`, () => showAssessment(assessment.id));
  }
  if (!catalog.artefacts.length || !catalog.assertions.length) {
    el('p', 'Import a permitted document and register a reviewed legal assertion before preparing an assessment.', root); return;
  }
  const artefact = field(root, 'Document', 'select', catalog.artefacts.map((record) => [record.id, `${record.title} · ${record.matter} · v${record.version}`]));
  const assertion = field(root, 'Reviewed assertion', 'select', catalog.assertions.map((record) => [record.id, `${record.title} · v${record.version}`]));
  const workspace = el('section', '', root);
  for (const input of [artefact, assertion]) input.addEventListener('change', () => workspace.replaceChildren());
  button(root, 'Load evidence', async () => {
    const context = await api({ action: 'assessment-context', artefactId: artefact.value, assertionId: assertion.value });
    workspace.replaceChildren(); sourceEvidence(workspace, context);
    const segment = field(workspace, 'Document segment', 'select', context.artefact.body.segments.map((item) => [item.id, `${item.id} · ${item.state}`]));
    const passage = field(workspace, 'Document text'); passage.readOnly = true; passage.removeAttribute('maxlength');
    const quoteStatus = el('p', 'Select a passage or record an evidence gap.', workspace); quoteStatus.setAttribute('role', 'status');
    let evidence = null;
    function changeSegment() {
      evidence = null; const selected = context.artefact.body.segments.find((item) => item.id === segment.value);
      passage.value = selected.state === 'available' ? selected.text : '';
      quoteStatus.textContent = selected.state === 'available' ? 'Select a passage or record an evidence gap.' : selected.reason;
    }
    segment.addEventListener('change', changeSegment); changeSegment();
    const capture = (start, end) => {
      const selected = context.artefact.body.segments.find((item) => item.id === segment.value);
      if (selected.state !== 'available') throw new Error('This segment requires evidence investigation.');
      evidence = evidenceSelection(selected.text, start, end);
      quoteStatus.textContent = `Selected passage: ${evidence.quote}`;
    };
    button(workspace, 'Use selected passage', async () => capture(passage.selectionStart, passage.selectionEnd));
    button(workspace, 'Use full segment', async () => capture(0, passage.value.length));
    button(workspace, 'Clear passage', async () => { evidence = null; quoteStatus.textContent = 'No passage selected.'; });
    const finding = field(workspace, 'Finding', 'select', [
      ['potential_conflict', 'Potential conflict'], ['potential_gap', 'Potential gap'], ['stale_reference', 'Reference requires updating'],
      ['no_material_impact_in_scope', 'No material impact in assessed scope'], ['insufficient_evidence', 'Insufficient evidence'],
    ]);
    const mode = field(workspace, 'Review mode', 'select', [['current_review', 'Current review'], ['readiness', 'Future readiness']]);
    if (['proposal', 'uncommenced'].includes(context.source.body.lifecycle)) mode.value = 'readiness';
    const severity = field(workspace, 'Severity', 'select', [['informational', 'Informational'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]);
    const rationale = field(workspace, 'Assessment rationale'), applicability = field(workspace, 'Application to this document');
    const gaps = field(workspace, 'Evidence investigations (one per line)');
    const complete = field(workspace, 'I have confirmed the relevant context is complete', 'input'); complete.type = 'checkbox';
    button(workspace, 'Save assessment for review', async () => {
      if (!rationale.value.trim() || !applicability.value.trim()) throw new Error('Enter the rationale and application to this document.');
      if (!evidence && finding.value !== 'insufficient_evidence') throw new Error('Select the supporting document passage.');
      const limitations = gaps.value.split('\n').map((line) => line.trim()).filter(Boolean);
      if (finding.value === 'insufficient_evidence' && !limitations.length) throw new Error('Describe the evidence investigation required.');
      const record = await api({ action: 'assessment-save', artefactId: context.artefact.id, assertionId: context.assertion.id,
        segmentId: segment.value, evidence, finding: finding.value, mode: mode.value, severity: severity.value,
        rationale: rationale.value, applicability: applicability.value, limitations, contextComplete: complete.checked,
        expectedVersion: context.previous.find((item) => item.segmentId === segment.value)?.version ?? 0 });
      await showAssessment(record.id);
    });
  });
}
