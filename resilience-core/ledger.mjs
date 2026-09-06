import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { extractText } from './extraction.mjs';
import { discoverPhrases } from './discovery.mjs';

// Internal domain API. Actors must come from a trusted authentication/ACL adapter,
// never from an HTTP request body. No network, model calls or source-file writes.
const hash = (value) => createHash('sha256').update(value).digest('hex');
const fail = (message) => { throw new Error(message); };
const required = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) fail(`Required: ${name}`);
  return value;
};
const oneOf = (value, options, name) => {
  if (!options.includes(value)) fail(`Invalid ${name}`);
  return value;
};
const types = ['template', 'draft', 'executed', 'checklist', 'playbook', 'advisory', 'training', 'control'];
const findings = ['potential_conflict', 'potential_gap', 'stale_reference', 'no_material_impact_in_scope', 'insufficient_evidence'];

function actorContext(actor, write = false, review = false) {
  required(actor?.tenantId, 'tenantId'); required(actor?.userId, 'userId');
  if (!Array.isArray(actor.matterIds) || !Array.isArray(actor.roles)) fail('Invalid actor scope');
  actor.matterIds.forEach((id) => required(id, 'matterId'));
  if (write && !actor.roles.some((role) => ['editor', 'reviewer'].includes(role))) fail('Forbidden');
  if (review && !actor.roles.includes('reviewer')) fail('Forbidden');
}
function accessible(actor, matterId) { return matterId === null || actor.matterIds.includes(matterId); }
function validSpan(text, span) {
  return span && Number.isSafeInteger(span.start) && Number.isSafeInteger(span.end)
    && span.start >= 0 && span.end > span.start && span.end <= text.length
    && typeof span.quote === 'string' && span.quote.trim().length > 0
    && text.slice(span.start, span.end) === span.quote;
}

export function cacheIdentity(input) {
  const keys = ['artefactHash', 'sourceHash', 'assertionHash', 'extractionVersion', 'modelVersion', 'promptVersion', 'schemaVersion', 'aclVersion'];
  const values = Object.fromEntries(keys.map((key) => [key, required(input[key], key)]));
  actorContext(input.actor);
  return hash(JSON.stringify({ ...values, tenantId: input.actor.tenantId, userId: input.actor.userId,
    matterIds: [...new Set(input.actor.matterIds)].sort(), roles: [...new Set(input.actor.roles)].sort() }));
}

export class Ledger {
  #db;
  constructor(path = ':memory:') {
    this.#db = new DatabaseSync(path);
    const version = this.#db.prepare('PRAGMA user_version').get().user_version;
    const tables = this.#db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    if (![0, 1, 2].includes(version) || (version === 0 && tables.length)) {
      this.#db.close();
      fail('Unsupported or unrelated database schema');
    }
    this.#db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY, tenant TEXT NOT NULL, kind TEXT NOT NULL,
        logical_key TEXT NOT NULL, version INTEGER NOT NULL,
        matter TEXT, body TEXT NOT NULL, hash TEXT NOT NULL,
        UNIQUE(tenant, kind, logical_key, version)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS decisions (
        id INTEGER PRIMARY KEY, record_id TEXT NOT NULL REFERENCES records(id),
        revision INTEGER NOT NULL, disposition TEXT NOT NULL, reason TEXT NOT NULL,
        actor TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(record_id, revision)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY, tenant TEXT NOT NULL, matter TEXT,
        actor TEXT NOT NULL, action TEXT NOT NULL, record_id TEXT NOT NULL REFERENCES records(id),
        created_at TEXT NOT NULL
      ) STRICT;
      PRAGMA user_version = 2;
      CREATE INDEX IF NOT EXISTS records_scope ON records(tenant,kind,matter);
      CREATE TRIGGER IF NOT EXISTS records_no_update BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT, 'Immutable record'); END;
      CREATE TRIGGER IF NOT EXISTS records_no_delete BEFORE DELETE ON records BEGIN SELECT RAISE(ABORT, 'Immutable record'); END;
      CREATE TRIGGER IF NOT EXISTS decisions_no_update BEFORE UPDATE ON decisions BEGIN SELECT RAISE(ABORT, 'Append-only decisions'); END;
      CREATE TRIGGER IF NOT EXISTS decisions_no_delete BEFORE DELETE ON decisions BEGIN SELECT RAISE(ABORT, 'Append-only decisions'); END;
      CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT, 'Append-only events'); END;
      CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT, 'Append-only events'); END;
    `);
  }
  close() { this.#db.close(); }
  #transaction(work) {
    this.#db.exec('BEGIN IMMEDIATE');
    try { const result = work(); this.#db.exec('COMMIT'); return result; }
    catch (error) { this.#db.exec('ROLLBACK'); throw error; }
  }
  #decode(row) { return row ? { ...row, body: JSON.parse(row.body) } : null; }
  #latest(actor, kind, key) {
    return this.#decode(this.#db.prepare('SELECT * FROM records WHERE tenant=? AND kind=? AND logical_key=? ORDER BY version DESC LIMIT 1').get(actor.tenantId, kind, key));
  }
  #get(actor, id, kind) {
    const row = this.#decode(this.#db.prepare('SELECT * FROM records WHERE tenant=? AND id=?').get(actor.tenantId, id));
    // Same response for missing, wrong-kind and inaccessible records.
    if (!row || row.kind !== kind || !accessible(actor, row.matter)) fail('Record unavailable');
    return row;
  }
  #current(actor, record) { return this.#latest(actor, record.kind, record.logical_key)?.id === record.id; }
  #event(actor, action, record) {
    this.#db.prepare('INSERT INTO events(tenant,matter,actor,action,record_id,created_at) VALUES(?,?,?,?,?,?)')
      .run(actor.tenantId, record.matter, actor.userId, action, record.id, new Date().toISOString());
  }
  #insert(actor, kind, key, matter, body, expectedVersion) {
    required(key, 'logical key');
    const previous = this.#latest(actor, kind, key);
    if (previous && !accessible(actor, previous.matter)) fail('Record unavailable');
    if (previous && previous.matter !== matter) fail('Matter reassignment requires a separate authorised migration');
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion !== (previous?.version ?? 0)) fail('Version conflict');
    const json = JSON.stringify(body);
    const row = { id: randomUUID(), tenant: actor.tenantId, kind, logical_key: key, version: expectedVersion + 1, matter, body: json, hash: hash(json) };
    this.#db.prepare('INSERT INTO records VALUES(?,?,?,?,?,?,?,?)').run(row.id, row.tenant, kind, key, row.version, matter, json, row.hash);
    this.#event(actor, `${kind}.created`, row);
    return this.#decode(row);
  }
  get(actor, id, kind) { actorContext(actor); return this.#get(actor, id, kind); }
  list(actor, kind) {
    actorContext(actor);
    // Filter before returning bodies/counts; SQLite stays behind a trusted local boundary.
    return this.#db.prepare('SELECT * FROM records WHERE tenant=? AND kind=? ORDER BY logical_key,version')
      .all(actor.tenantId, kind).filter((row) => accessible(actor, row.matter)).map((row) => this.#decode(row));
  }
  addSource(actor, input) {
    actorContext(actor, true);
    const body = { title: required(input.title, 'title'), text: required(input.text, 'source text'),
      jurisdiction: required(input.jurisdiction, 'jurisdiction'), provision: required(input.provision, 'provision'),
      locator: required(input.locator, 'source locator'), lifecycle: oneOf(input.lifecycle, ['proposal', 'uncommenced', 'current', 'repealed', 'guidance'], 'lifecycle'),
      effectiveDate: input.effectiveDate ?? null, retrievedAt: required(input.retrievedAt, 'retrievedAt') };
    if (Number.isNaN(Date.parse(body.retrievedAt))) fail('Invalid retrieval timestamp');
    if (body.effectiveDate !== null) {
      const parsed = new Date(`${body.effectiveDate}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.effectiveDate) || Number.isNaN(parsed.getTime())
        || parsed.toISOString().slice(0, 10) !== body.effectiveDate) fail('Invalid effective date');
    }
    body.contentHash = hash(body.text);
    return this.#transaction(() => this.#insert(actor, 'source', input.key, null, body, input.expectedVersion));
  }
  addAssertion(actor, input) {
    actorContext(actor, true, true);
    return this.#transaction(() => {
      const source = this.#get(actor, input.sourceId, 'source');
      if (!this.#current(actor, source)) fail('Source version superseded');
      if (!validSpan(source.body.text, input.evidence)) fail('Invalid source evidence');
      const body = { sourceId: source.id, interpretation: required(input.interpretation, 'interpretation'),
        applicability: required(input.applicability, 'applicability'), exceptions: required(input.exceptions, 'exceptions'),
        evidence: input.evidence, approvedBy: actor.userId, approvedAt: new Date().toISOString() };
      return this.#insert(actor, 'assertion', input.key, null, body, input.expectedVersion);
    });
  }
  addArtefact(actor, input) {
    actorContext(actor, true);
    required(input.matterId, 'matterId');
    if (!accessible(actor, input.matterId)) fail('Forbidden');
    if (!Array.isArray(input.segments) || !input.segments.length) fail('Explicit segment inventory required');
    const seen = new Set();
    const segments = input.segments.map((segment) => {
      required(segment.id, 'segment id');
      if (seen.has(segment.id)) fail('Duplicate segment');
      seen.add(segment.id);
      oneOf(segment.state, ['available', 'failed', 'excluded'], 'segment state');
      return { id: segment.id, state: segment.state,
        text: segment.state === 'available' ? required(segment.text, 'segment text') : '',
        reason: segment.state === 'available' ? null : required(segment.reason, 'coverage reason') };
    });
    const body = { title: required(input.title, 'title'), type: oneOf(input.type, types, 'artefact type'),
      owner: required(input.owner, 'owner'), extractionVersion: required(input.extractionVersion, 'extractionVersion'),
      inventoryComplete: input.inventoryComplete === true, segments };
    if (input.provenance) body.provenance = structuredClone(input.provenance);
    return this.#transaction(() => this.#insert(actor, 'artefact', input.key, input.matterId, body, input.expectedVersion));
  }
  ingestText(actor, input) {
    actorContext(actor, true);
    if (!accessible(actor, required(input.matterId, 'matterId'))) fail('Forbidden');
    const extraction = extractText(input.bytes, input);
    if (input.remote) extraction.provenance.remote = structuredClone(input.remote);
    return this.addArtefact(actor, { ...input, ...extraction });
  }
  discover(actor, assertionId, { phrases, limit = 250 }) {
    actorContext(actor);
    const assertion = this.#get(actor, assertionId, 'assertion');
    const source = this.#get(actor, assertion.body.sourceId, 'source');
    if (![assertion, source].every((record) => this.#current(actor, record))) fail('Evidence version superseded');
    const artefacts = this.list(actor, 'artefact').filter((record) => this.#current(actor, record));
    return { assertionId, ...discoverPhrases(artefacts, phrases, limit) };
  }
  proposeDependency(actor, input) {
    actorContext(actor, true);
    return this.#transaction(() => {
      const artefact = this.#get(actor, input.artefactId, 'artefact');
      const assertion = this.#get(actor, input.assertionId, 'assertion');
      const source = this.#get(actor, assertion.body.sourceId, 'source');
      if (![artefact, assertion, source].every((record) => this.#current(actor, record))) fail('Evidence version superseded');
      const segment = artefact.body.segments.find((item) => item.id === input.segmentId);
      // Invalid grounding remains visible as a blocked candidate, never a quiet no-hit.
      const evidenceValid = segment?.state === 'available' && validSpan(segment.text, input.evidence);
      const body = { artefactId: artefact.id, assertionId: assertion.id, segmentId: required(input.segmentId, 'segmentId'),
        evidence: input.evidence ?? null, rationale: required(input.rationale, 'rationale'),
        evidenceValid: Boolean(evidenceValid), blocker: evidenceValid ? null : 'Invalid or unavailable artefact span',
        discovery: oneOf(input.discovery, ['manual', 'lexical'], 'discovery method') };
      const key = hash(JSON.stringify([artefact.id, assertion.id, body.segmentId]));
      return this.#insert(actor, 'dependency', key, artefact.matter, body, input.expectedVersion ?? 0);
    });
  }
  #decision(id) {
    return this.#db.prepare('SELECT * FROM decisions WHERE record_id=? ORDER BY revision DESC LIMIT 1').get(id) ?? null;
  }
  reviewDependency(actor, id, { disposition, reason, expectedRevision }) {
    actorContext(actor, true, true);
    oneOf(disposition, ['confirmed', 'rejected'], 'disposition'); required(reason, 'review reason');
    return this.#transaction(() => {
      const dependency = this.#get(actor, id, 'dependency');
      if (!this.#current(actor, dependency)) fail('Dependency version superseded');
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== (this.#decision(id)?.revision ?? 0)) fail('Review conflict');
      if (disposition === 'confirmed') {
        if (!dependency.body.evidenceValid) fail('Blocked evidence');
        const artefact = this.#get(actor, dependency.body.artefactId, 'artefact');
        const assertion = this.#get(actor, dependency.body.assertionId, 'assertion');
        const source = this.#get(actor, assertion.body.sourceId, 'source');
        if (![artefact, assertion, source].every((record) => this.#current(actor, record))) fail('Evidence version superseded');
      }
      this.#db.prepare('INSERT INTO decisions(record_id,revision,disposition,reason,actor,created_at) VALUES(?,?,?,?,?,?)')
        .run(id, expectedRevision + 1, disposition, reason, actor.userId, new Date().toISOString());
      this.#event(actor, `dependency.${disposition}`, dependency);
      const decision = this.#decision(id);
      return { recordId: id, revision: decision.revision, disposition: decision.disposition,
        reason: decision.reason, actor: decision.actor, createdAt: decision.created_at };
    });
  }
  proposeAssessment(actor, input) {
    actorContext(actor, true);
    return this.#transaction(() => {
      const artefact = this.#get(actor, input.artefactId, 'artefact');
      const assertion = this.#get(actor, input.assertionId, 'assertion');
      const source = this.#get(actor, assertion.body.sourceId, 'source');
      if (![artefact, assertion, source].every((record) => this.#current(actor, record))) fail('Evidence version superseded');
      const segment = artefact.body.segments.find((item) => item.id === input.segmentId);
      if (!segment) fail('Unknown assessment segment');
      const finding = oneOf(input.finding, findings, 'finding');
      const mode = oneOf(input.mode, ['current_review', 'readiness'], 'assessment mode');
      if (['proposal', 'uncommenced'].includes(source.body.lifecycle) && mode !== 'readiness') fail('Future sources require readiness assessment');
      if (!Array.isArray(input.limitations)) fail('Explicit limitations required');
      const limitations = input.limitations.map((value) => required(value, 'limitation'));
      if (finding === 'insufficient_evidence' && limitations.length === 0) fail('Evidence gap requires a limitation');
      const evidence = input.evidence ?? null;
      const uncertaintyWithoutQuote = finding === 'insufficient_evidence' && evidence === null;
      const evidenceValid = uncertaintyWithoutQuote || (segment.state === 'available' && validSpan(segment.text, evidence));
      const blockers = evidenceValid ? [] : ['Invalid or unavailable artefact span'];
      if (finding === 'no_material_impact_in_scope' && (!artefact.body.inventoryComplete
        || artefact.body.segments.some((item) => item.state !== 'available')
        || input.contextComplete !== true || limitations.length > 0)) {
        blockers.push('No-impact review requires complete extraction inventory and explicitly complete context without unresolved limitations');
      }
      const body = { artefactId: artefact.id, assertionId: assertion.id, sourceId: source.id,
        segmentId: segment.id, finding, mode, legalLifecycle: source.body.lifecycle,
        rationale: required(input.rationale, 'rationale'), applicability: required(input.applicability, 'applicability reasoning'),
        severity: oneOf(input.severity, ['informational', 'low', 'medium', 'high'], 'severity'),
        limitations, contextComplete: input.contextComplete === true, evidence, blockers,
        proposedBy: actor.userId, proposedAt: new Date().toISOString(), method: 'manual' };
      const key = hash(JSON.stringify([artefact.id, assertion.id, segment.id]));
      return this.#insert(actor, 'assessment', key, artefact.matter, body, input.expectedVersion ?? 0);
    });
  }
  #assessmentView(actor, assessment) {
    const artefact = this.#get(actor, assessment.body.artefactId, 'artefact');
    const assertion = this.#get(actor, assessment.body.assertionId, 'assertion');
    const source = this.#get(actor, assessment.body.sourceId, 'source');
    const stale = ![assessment, artefact, assertion, source].every((record) => this.#current(actor, record));
    const decision = this.#decision(assessment.id);
    const workflow = decision?.disposition === 'rejected' ? 'rejected'
      : stale ? 'review_required' : assessment.body.blockers.length ? 'blocked' : decision?.disposition ?? 'unreviewed';
    return { ...assessment, workflow, stale, decision: decision ? {
      revision: decision.revision, disposition: decision.disposition, reason: decision.reason,
      actor: decision.actor, createdAt: decision.created_at,
    } : null };
  }
  getAssessment(actor, id) {
    actorContext(actor);
    return this.#assessmentView(actor, this.#get(actor, id, 'assessment'));
  }
  reviewAssessment(actor, id, { disposition, reason, expectedRevision }) {
    actorContext(actor, true, true);
    oneOf(disposition, ['approved', 'rejected'], 'disposition'); required(reason, 'review reason');
    return this.#transaction(() => {
      const assessment = this.#get(actor, id, 'assessment');
      if (!this.#current(actor, assessment)) fail('Assessment version superseded');
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== (this.#decision(id)?.revision ?? 0)) fail('Review conflict');
      if (disposition === 'approved') {
        const view = this.#assessmentView(actor, assessment);
        if (view.stale) fail('Evidence version superseded');
        if (assessment.body.blockers.length) fail('Blocked assessment');
      }
      this.#db.prepare('INSERT INTO decisions(record_id,revision,disposition,reason,actor,created_at) VALUES(?,?,?,?,?,?)')
        .run(id, expectedRevision + 1, disposition, reason, actor.userId, new Date().toISOString());
      this.#event(actor, `assessment.${disposition}`, assessment);
      return this.#assessmentView(actor, assessment);
    });
  }
  coverage(actor, artefactId) {
    actorContext(actor);
    const artefact = this.#get(actor, artefactId, 'artefact');
    const dependencies = this.list(actor, 'dependency').filter((record) => record.body.artefactId === artefactId && this.#current(actor, record));
    const assessments = this.list(actor, 'assessment')
      .filter((record) => record.body.artefactId === artefactId && this.#current(actor, record))
      .map((record) => this.#assessmentView(actor, record));
    const segments = artefact.body.segments.map(({ id, state, reason }) => {
      const links = dependencies.filter((record) => record.body.segmentId === id);
      const validConfirmed = links.filter((record) => {
        if (this.#decision(record.id)?.disposition !== 'confirmed') return false;
        const assertion = this.#get(actor, record.body.assertionId, 'assertion');
        const source = this.#get(actor, assertion.body.sourceId, 'source');
        return this.#current(actor, artefact) && this.#current(actor, assertion) && this.#current(actor, source);
      });
      const scopedFindings = assessments.filter((record) => record.body.segmentId === id).map((record) => ({
        assessmentId: record.id, assertionId: record.body.assertionId, finding: record.body.finding,
        mode: record.body.mode, workflow: record.workflow, stale: record.stale,
      }));
      return { id, extraction: state, reason, confirmedDependencies: validConfirmed.length,
        candidates: links.filter((record) => !this.#decision(record.id)).length,
        blocked: links.filter((record) => !record.body.evidenceValid && this.#decision(record.id)?.disposition !== 'rejected').length,
        assessment: scopedFindings.length ? 'scoped_findings_recorded' : 'not_assessed', scopedFindings };
    });
    return { artefactId, inventoryComplete: artefact.body.inventoryComplete, segments,
      caveat: 'Dependency confirmation is not legal impact assessment. Findings cover only the listed assertion/segment scopes; missing scopes and extraction gaps are not cleared.' };
  }
  planSourceChange(actor, sourceId) {
    actorContext(actor);
    const source = this.#get(actor, sourceId, 'source');
    if (!this.#current(actor, source)) fail('Source version superseded');
    const tasks = this.list(actor, 'dependency').flatMap((dependency) => {
      if (!this.#current(actor, dependency) || this.#decision(dependency.id)?.disposition !== 'confirmed') return [];
      const assertion = this.#get(actor, dependency.body.assertionId, 'assertion');
      const before = this.#get(actor, assertion.body.sourceId, 'source');
      if (before.logical_key !== source.logical_key || before.id === source.id) return [];
      const original = this.#get(actor, dependency.body.artefactId, 'artefact');
      const current = this.#latest(actor, 'artefact', original.logical_key);
      return [{ dependencyId: dependency.id, artefactId: current.id, title: current.body.title,
        owner: current.body.owner, fromSourceId: before.id, toSourceId: source.id,
        priorArtefactId: original.id, requiresRelocalisation: original.id !== current.id,
        action: current.body.type === 'executed' ? 'legal_variation_assessment' : current.body.type === 'control' ? 'review_rule_and_test' : 'propose_owner_review',
        status: 'unreviewed', legalLifecycle: source.body.lifecycle }];
    });
    return { sourceId, tasks, discoveryRequired: true,
      caveat: 'Known dependencies only. New obligations, unknown links and applicability require a separate review. No edits were published.' };
  }
  proposeChangeSet(actor, input) {
    actorContext(actor, true);
    const expiresAt = Date.parse(input.reviewExpiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) fail('Future review expiry required');
    if (!Array.isArray(input.items) || !input.items.length || input.items.length > 50) fail('Provide 1–50 changes');
    return this.#transaction(() => {
      const seen = new Set(); const targets = new Set(); let matter;
      const items = input.items.map((proposed) => {
        const assessment = this.#get(actor, proposed.assessmentId, 'assessment');
        const view = this.#assessmentView(actor, assessment);
        if (view.workflow !== 'approved' || assessment.body.mode !== 'current_review'
          || !['potential_conflict', 'potential_gap', 'stale_reference'].includes(assessment.body.finding)
          || assessment.body.limitations.length || !assessment.body.contextComplete) fail('Approved actionable assessment required');
        const artefact = this.#get(actor, assessment.body.artefactId, 'artefact');
        if (['executed', 'control'].includes(artefact.body.type)) fail('Separate legal variation or control release workflow required');
        if (!artefact.body.inventoryComplete || artefact.body.segments.length !== 1
          || artefact.body.segments[0].state !== 'available') fail('Publication currently supports complete single-segment text only');
        if (seen.has(artefact.id)) fail('One change per artefact per change set');
        seen.add(artefact.id);
        if (matter !== undefined && matter !== artefact.matter) fail('A change set must stay within one matter');
        matter = artefact.matter;
        const beforeText = artefact.body.segments[0].text;
        const evidence = assessment.body.evidence;
        if (!validSpan(beforeText, evidence)) fail('Invalid publication anchor');
        const replacement = required(proposed.replacement, 'replacement');
        const afterText = beforeText.slice(0, evidence.start) + replacement + beforeText.slice(evidence.end);
        if (afterText === beforeText || Buffer.byteLength(afterText) > 1024 * 1024) fail('Invalid or unchanged replacement');
        const target = artefact.body.provenance?.remote;
        if (!target || target.matterId !== matter || !['driveId', 'folderId', 'itemId', 'eTag', 'hash']
          .every((key) => typeof target[key] === 'string' && target[key].trim())) fail('Versioned publication target required');
        if (target.hash !== hash(beforeText)) fail('Imported bytes do not match publication text');
        const targetKey = JSON.stringify([target.driveId, target.itemId]);
        if (targets.has(targetKey)) fail('Duplicate publication target');
        targets.add(targetKey);
        if (input.rollbackOf) {
          const prior = this.#get(actor, input.rollbackOf, 'publication');
          if (!prior.body.publishedArtefactId || prior.body.publishedArtefactId !== artefact.id) fail('Rollback reference does not match target');
        }
        return { assessmentId: assessment.id, assessmentRevision: view.decision.revision,
          artefactId: artefact.id, assertionId: assessment.body.assertionId, sourceId: assessment.body.sourceId,
          owner: artefact.body.owner, target, beforeText, afterText, afterHash: hash(afterText), artefactType: artefact.body.type };
      });
      const changeSet = this.#insert(actor, 'change_set', input.key, matter, {
        title: required(input.title, 'change-set title'), rationale: required(input.rationale, 'change rationale'),
        reviewExpiresAt: new Date(expiresAt).toISOString(), items, rollbackOf: input.rollbackOf ?? null,
      }, 0);
      items.forEach((item, index) => this.#insert(actor, 'publication', `${changeSet.id}:${index}`, matter,
        { changeSetId: changeSet.id, index, status: 'queued', attempts: 0, receipt: null }, 0));
      return this.getChangeSet(actor, changeSet.id);
    });
  }
  #ownerDecision(actor, changeSet, index) {
    return this.#latest(actor, 'owner_review', `${changeSet.id}:${index}`);
  }
  reviewOwnership(actor, id, { index, disposition, reason, expectedVersion }) {
    actorContext(actor, true);
    oneOf(disposition, ['approved', 'rejected'], 'owner disposition'); required(reason, 'owner reason');
    return this.#transaction(() => {
      const changeSet = this.#get(actor, id, 'change_set');
      if (!Number.isSafeInteger(index) || changeSet.body.items[index]?.owner !== actor.userId) fail('Only the recorded owner may decide');
      return this.#insert(actor, 'owner_review', `${id}:${index}`, changeSet.matter,
        { changeSetId: id, index, disposition, reason, actor: actor.userId }, expectedVersion);
    });
  }
  #itemFresh(actor, item, publishedArtefactId) {
    const assessment = this.#get(actor, item.assessmentId, 'assessment');
    return [[item.assertionId, 'assertion'], [item.sourceId, 'source'], [assessment.id, 'assessment'],
      [publishedArtefactId ?? item.artefactId, 'artefact']]
      .every(([id, kind]) => this.#current(actor, this.#get(actor, id, kind)))
      && this.#decision(assessment.id)?.disposition === 'approved'
      && this.#decision(assessment.id)?.revision === item.assessmentRevision;
  }
  #jobs(actor, changeSet) {
    return changeSet.body.items.map((_, index) => this.#latest(actor, 'publication', `${changeSet.id}:${index}`));
  }
  getChangeSet(actor, id) {
    actorContext(actor);
    const changeSet = this.#get(actor, id, 'change_set');
    const jobs = this.#jobs(actor, changeSet);
    const stale = Date.parse(changeSet.body.reviewExpiresAt) <= Date.now()
      || changeSet.body.items.some((item, index) => !this.#itemFresh(actor, item, jobs[index]?.body.publishedArtefactId));
    const decision = this.#decision(id);
    const approved = decision?.disposition === 'approved';
    const ownerReviews = changeSet.body.items.map((_, index) => this.#ownerDecision(actor, changeSet, index));
    const published = jobs.filter((job) => job.body.status.startsWith('published')).length;
    const ownersApproved = ownerReviews.every((review) => review?.body.disposition === 'approved');
    const status = published === jobs.length ? (stale || !approved || !ownersApproved ? 'published_review_required' : 'published')
      : published > 0 ? 'partially_published' : stale ? 'review_required'
        : !approved ? decision?.disposition ?? 'unreviewed'
          : !ownersApproved ? 'awaiting_owner_review' : 'approved';
    return { ...changeSet, status, stale, jobs, ownerReviews,
      decision: decision ? { revision: decision.revision, disposition: decision.disposition, actor: decision.actor, reason: decision.reason } : null };
  }
  reviewChangeSet(actor, id, { disposition, reason, expectedRevision }) {
    actorContext(actor, true, true);
    oneOf(disposition, ['approved', 'rejected'], 'change-set disposition'); required(reason, 'review reason');
    return this.#transaction(() => {
      const view = this.getChangeSet(actor, id);
      if (expectedRevision !== (view.decision?.revision ?? 0)) fail('Review conflict');
      if (disposition === 'approved' && view.stale) fail('Change-set evidence superseded or expired');
      this.#db.prepare('INSERT INTO decisions(record_id,revision,disposition,reason,actor,created_at) VALUES(?,?,?,?,?,?)')
        .run(id, expectedRevision + 1, disposition, reason, actor.userId, new Date().toISOString());
      this.#event(actor, `change_set.${disposition}`, view);
      return this.getChangeSet(actor, id);
    });
  }
  // Worker-only operations below are intentionally absent from the public service whitelist.
  claimPublication(actor, id) {
    actorContext(actor, true);
    return this.#transaction(() => {
      const requested = this.#get(actor, id, 'publication');
      const job = this.#latest(actor, 'publication', requested.logical_key);
      const changeSet = this.#get(actor, job.body.changeSetId, 'change_set');
      const item = changeSet.body.items[job.body.index];
      if (job.body.status.startsWith('published')) return job;
      if (job.body.status === 'running' || job.body.status === 'reconciliation_required') fail('Publication requires reconciliation');
      if (job.body.status === 'blocked' || job.body.attempts >= 3) fail('Publication blocked');
      if ((job.body.retryAfter ?? 0) > Date.now()) fail('Retry backoff active');
      if (this.#decision(changeSet.id)?.disposition !== 'approved'
        || this.#ownerDecision(actor, changeSet, job.body.index)?.body.disposition !== 'approved') fail('Legal and owner approvals required');
      if (Date.parse(changeSet.body.reviewExpiresAt) <= Date.now() || !this.#itemFresh(actor, item)) fail('Change-set evidence superseded or expired');
      return this.#insert(actor, 'publication', job.logical_key, job.matter, { ...job.body,
        status: 'running', attempts: job.body.attempts + 1, worker: actor.userId,
        leaseId: randomUUID(), leaseExpiresAt: Date.now() + 60000,
      }, job.version);
    });
  }
  publicationInput(actor, id) {
    actorContext(actor, true);
    const job = this.#get(actor, id, 'publication');
    if (!this.#current(actor, job) || job.body.status !== 'running' || job.body.worker !== actor.userId) fail('Publication lease unavailable');
    const changeSet = this.#get(actor, job.body.changeSetId, 'change_set');
    const item = changeSet.body.items[job.body.index];
    if (job.body.leaseExpiresAt <= Date.now() || !this.#itemFresh(actor, item)
      || Date.parse(changeSet.body.reviewExpiresAt) <= Date.now()
      || this.#decision(changeSet.id)?.disposition !== 'approved'
      || this.#ownerDecision(actor, changeSet, job.body.index)?.body.disposition !== 'approved') fail('Publication approval expired or revoked');
    return structuredClone(item);
  }
  #recordPublished(actor, job, receipt) {
    const changeSet = this.#get(actor, job.body.changeSetId, 'change_set');
    const item = changeSet.body.items[job.body.index];
    if (receipt.itemId !== item.target.itemId || receipt.beforeETag !== item.target.eTag
      || receipt.hash !== item.afterHash || !receipt.afterETag || receipt.afterETag === receipt.beforeETag) fail('Invalid publication receipt');
    const original = this.#get(actor, item.artefactId, 'artefact');
    const approvalsCurrent = this.#itemFresh(actor, item) && Date.parse(changeSet.body.reviewExpiresAt) > Date.now()
      && this.#decision(changeSet.id)?.disposition === 'approved'
      && this.#ownerDecision(actor, changeSet, job.body.index)?.body.disposition === 'approved';
    let publishedArtefactId = null;
    if (this.#current(actor, original)) {
      const body = structuredClone(original.body);
      body.segments[0].text = item.afterText;
      body.provenance = { ...body.provenance, contentHash: item.afterHash, byteLength: Buffer.byteLength(item.afterText),
        remote: { ...item.target, eTag: receipt.afterETag, hash: receipt.hash }, changeSetId: changeSet.id };
      publishedArtefactId = this.#insert(actor, 'artefact', original.logical_key, original.matter, body, original.version).id;
    }
    return this.#insert(actor, 'publication', job.logical_key, job.matter, { ...job.body,
      status: publishedArtefactId && approvalsCurrent ? 'published' : 'published_review_required', receipt,
      publishedArtefactId, completedAt: new Date().toISOString(), leaseId: null,
    }, job.version);
  }
  finishPublication(actor, id, { leaseId, receipt, failure, retryAfterMs = 0 }) {
    actorContext(actor, true);
    return this.#transaction(() => {
      const job = this.#get(actor, id, 'publication');
      if (!this.#current(actor, job) || job.body.status !== 'running' || job.body.worker !== actor.userId
        || job.body.leaseId !== leaseId) fail('Publication lease conflict');
      if (receipt) return this.#recordPublished(actor, job, receipt);
      oneOf(failure, ['retryable', 'blocked', 'reconciliation_required'], 'publication failure');
      if (!Number.isFinite(retryAfterMs) || retryAfterMs < 0) fail('Invalid retry delay');
      return this.#insert(actor, 'publication', job.logical_key, job.matter, { ...job.body,
        status: failure, retryAfter: Date.now() + Math.max(retryAfterMs, 1000 * 2 ** job.body.attempts), leaseId: null,
      }, job.version);
    });
  }
  reconcilePublication(actor, id, { observedETag, observedHash, reason }) {
    actorContext(actor, true, true); required(reason, 'reconciliation reason');
    return this.#transaction(() => {
      const requested = this.#get(actor, id, 'publication');
      const job = this.#latest(actor, 'publication', requested.logical_key);
      const changeSet = this.#get(actor, job.body.changeSetId, 'change_set');
      const item = changeSet.body.items[job.body.index];
      if (item.owner !== actor.userId) fail('Reconciliation requires the owner with reviewer authority');
      if (job.body.status !== 'reconciliation_required'
        && !(job.body.status === 'running' && job.body.leaseExpiresAt <= Date.now())) fail('No interrupted publication to reconcile');
      if (observedHash === item.afterHash && observedETag !== item.target.eTag) {
        return this.#recordPublished(actor, job, { itemId: item.target.itemId, beforeETag: item.target.eTag,
          afterETag: observedETag, hash: observedHash, reconciliationReason: reason, attribution: 'Observed desired content; original write acknowledgement was unavailable' });
      }
      const unchanged = observedHash === item.target.hash && observedETag === item.target.eTag;
      return this.#insert(actor, 'publication', job.logical_key, job.matter, { ...job.body,
        status: unchanged && job.body.attempts < 3 ? 'queued' : 'blocked', leaseId: null, reconciliationReason: reason,
      }, job.version);
    });
  }
  audit(actor) {
    actorContext(actor);
    return this.#db.prepare('SELECT * FROM events WHERE tenant=? ORDER BY id').all(actor.tenantId)
      .filter((row) => accessible(actor, row.matter))
      .map((row) => ({ actor: row.actor, matter: row.matter, action: row.action, recordId: row.record_id, createdAt: row.created_at }));
  }
}

// Deliberately narrow discovery baseline: literal text matching, no legal inference.
// Returned candidates still require proposeDependency + independent human review.
export function discoverLiteralCandidates(artefact, term) {
  required(term, 'search term');
  return artefact.body.segments.flatMap((segment) => {
    if (segment.state !== 'available') return [];
    const start = segment.text.indexOf(term);
    return start < 0 ? [] : [{ segmentId: segment.id, evidence: { start, end: start + term.length, quote: term }, discovery: 'lexical' }];
  });
}
