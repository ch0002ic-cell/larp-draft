import { assessmentWorkspace } from './assessments.js';
const $ = (id) => document.getElementById(id);
const session = await fetch('/session').then((response) => response.json());
$('mode').textContent = session.demo ? 'Synthetic demonstration · changes reset when the server stops · not legal advice'
  : 'Local Microsoft operator console · acting as the token holder · live SharePoint writes';
let selected;
const el = (tag, text, parent) => { const node = document.createElement(tag); node.textContent = text; parent?.append(node); return node; };
async function api(input) {
  const response = await fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Larp-Token': session.token }, body: JSON.stringify(input) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
}
let inProgress = false;
async function run(action) {
  if (inProgress) return;
  inProgress = true;
  document.querySelectorAll('button, input, select, textarea').forEach((button) => { button.disabled = true; });
  $('status').textContent = 'Working…';
  try { await action(); $('status').textContent = 'Up to date.'; }
  catch (error) { $('status').textContent = error.message; }
  finally { inProgress = false; document.querySelectorAll('button, input, select, textarea').forEach((button) => { button.disabled = false; }); }
}
function button(parent, title, action) { const node = el('button', title, parent); node.addEventListener('click', () => run(action)); return node; }
function reviewForm(parent, label, action) {
  const id = `reason-${document.querySelectorAll('textarea').length}`;
  const caption = el('label', label, parent); caption.htmlFor = id;
  const reason = el('textarea', '', parent); reason.id = id; reason.maxLength = 2000;
  for (const disposition of ['approved', 'rejected']) button(parent, disposition === 'approved' ? 'Approve' : 'Reject', async () => {
    if (!reason.value.trim()) throw new Error('Enter a reason for this decision.');
    await api({ ...action, disposition, reason: reason.value }); await view(selected);
  });
}
async function view(id) {
  const { change, evidence } = await api({ action: 'view', id }); selected = id;
  const root = $('detail'); root.replaceChildren();
  el('h2', change.body.title, root); el('p', `Status: ${change.status.replaceAll('_', ' ')} · review expires ${change.body.reviewExpiresAt}`, root);
  el('p', change.body.rationale, root);
  if (change.stale) el('p', 'Evidence or review has expired. A fresh review is required.', root).className = 'warning';
  el('p', `Legal decision: ${change.decision?.disposition ?? 'Pending'}${change.decision ? ` — ${change.decision.reason}` : ''}`, root);
  reviewForm(root, 'Legal review reason', { action: 'legal', id, expectedRevision: change.decision?.revision ?? 0 });
  change.body.items.forEach((item, index) => {
    const card = el('article', '', root), job = change.jobs[index], owner = change.ownerReviews[index];
    el('h3', `Change ${index + 1} · ${item.artefactType}`, card);
    el('p', `Owner: ${item.owner} · owner decision: ${owner?.body.disposition ?? 'Pending'} · publication: ${job.body.status.replaceAll('_', ' ')}`, card);
    const source = evidence[index].source.body, assertion = evidence[index].assertion.body;
    const details = el('details', '', card); el('summary', 'Source and reviewed reasoning', details);
    el('h4', source.title, details); el('p', `Status: ${source.lifecycle} · source locator: ${source.locator}`, details);
    el('pre', source.text, details); el('p', assertion.interpretation, details);
    el('p', `Applicability: ${assertion.applicability}\nExceptions: ${assertion.exceptions}`, details);
    el('p', evidence[index].assessment.body.rationale, details);
    const wording = el('div', '', card); wording.className = 'wording';
    for (const [title, text] of [['Current wording', item.beforeText], ['Proposed wording', item.afterText]]) {
      const column = el('div', '', wording); el('h4', title, column); el('pre', text, column);
    }
    reviewForm(card, 'Recorded owner’s reason', { action: 'owner', id, index, expectedVersion: owner?.version ?? 0 });
    if (!job.body.status.startsWith('published')) {
      button(card, session.demo ? 'Publish to synthetic store' : 'Publish to SharePoint', async () => { await api({ action: 'publish', jobId: job.id }); await view(id); });
      if (['running', 'reconciliation_required'].includes(job.body.status)) {
        const label = el('label', 'Reconciliation reason', card); const reason = el('textarea', '', card);
        reason.id = `reconcile-${index}`; label.htmlFor = reason.id;
        button(card, 'Check destination and reconcile', async () => {
          if (!reason.value.trim()) throw new Error('Enter a reconciliation reason.');
          await api({ action: 'reconcile', jobId: job.id, reason: reason.value }); await view(id);
        });
      }
    }
  });
}
async function refresh() {
  const changes = await api({ action: 'list' }); $('queue').replaceChildren();
  for (const change of changes) button($('queue'), change.body.title, () => view(change.id));
  if (!changes.length) { $('detail').replaceChildren(); el('p', 'No accessible change sets. Prepare reviewed assessments and proposed changes using the maintenance service.', $('detail')); }
  else await view(changes.some((change) => change.id === selected) ? selected : changes[0].id);
}
$('assessments').addEventListener('click', () => run(() => assessmentWorkspace({ api, run, el, button, root: $('detail'), queue: $('queue'), openChange: view })));
$('refresh').addEventListener('click', () => run(refresh));
await run(refresh);
