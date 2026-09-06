import test from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from './ledger.mjs';
import { extractText, maxInputBytes } from './extraction.mjs';
import { reviewer, editor, artefactInput, seed } from './fixtures.mjs';

test('extraction preserves exact UTF-8 and explicit attachment coverage', () => {
  const text = '\uFEFFClause α\r\n  Notify owner.\n';
  const parsed = extractText(Buffer.from(text), { mediaType: 'text/plain', attachmentsComplete: true });
  assert.equal(parsed.segments[0].text, text);
  assert.equal(parsed.inventoryComplete, true);
  assert.equal(parsed.provenance.byteLength, Buffer.byteLength(text));
  assert.equal(extractText(Buffer.from(text), { mediaType: 'text/plain' }).inventoryComplete, false);
});

test('unsupported, oversized, empty and invalid inputs remain extraction failures', () => {
  for (const [bytes, mediaType] of [[Buffer.from('%PDF'), 'application/pdf'],
    [Buffer.from([0xff]), 'text/plain'], [Buffer.from(''), 'text/plain'],
    [Buffer.from('a\0b'), 'text/plain'], [Buffer.alloc(maxInputBytes + 1), 'text/plain']]) {
    const result = extractText(bytes, { mediaType, attachmentsComplete: true });
    assert.equal(result.segments[0].state, 'failed');
    assert.equal(result.inventoryComplete, false);
    assert.ok(result.segments[0].reason);
  }
});

test('ingestion checks matter permissions and records parsing gaps durably', (t) => {
  const ledger = new Ledger(); t.after(() => ledger.close());
  const input = { ...artefactInput({ key: 'import' }), bytes: Buffer.from('%PDF'), mediaType: 'application/pdf' };
  assert.throws(() => ledger.ingestText({ ...editor, matterIds: [] }, input), /Forbidden/);
  const record = ledger.ingestText(editor, input);
  assert.equal(ledger.coverage(reviewer, record.id).segments[0].extraction, 'failed');
  assert.equal(record.body.provenance.contentHash.length, 64);
});

test('discovery only searches permitted latest versions and reports limits and gaps', (t) => {
  const ledger = new Ledger(); t.after(() => ledger.close());
  const { assertion } = seed(ledger);
  ledger.addArtefact(editor, artefactInput({ expectedVersion: 1,
    segments: [{ id: 's', state: 'available', text: 'INCIDENT OWNER (demo.1)' }] }));
  ledger.addArtefact(editor, artefactInput({ key: 'second' }));
  ledger.addArtefact({ ...editor, matterIds: ['secret'] }, artefactInput({ key: 'private', matterId: 'secret' }));
  ledger.ingestText(editor, { ...artefactInput({ key: 'scan' }), mediaType: 'application/pdf', bytes: Buffer.from('scan') });
  const found = ledger.discover(reviewer, assertion.id, { phrases: ['incident owner', '(demo.1)'], limit: 1 });
  assert.equal(found.matchedSegments, 2);
  assert.equal(found.truncated, true);
  assert.equal(found.unavailableSegments, 1);
  const candidate = found.candidates[0];
  const artefact = ledger.get(reviewer, candidate.artefactId, 'artefact');
  assert.equal(artefact.version, 2);
  assert.equal(artefact.body.segments[0].text.slice(candidate.evidence.start, candidate.evidence.end), candidate.evidence.quote);
  const empty = ledger.discover(reviewer, assertion.id, { phrases: ['totally absent'] });
  assert.equal(empty.discoveryRequired, true);
  assert.equal(empty.candidates.length, 0);
});
