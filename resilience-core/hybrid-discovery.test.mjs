import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverHybrid, discoverPhrases } from './discovery.mjs';
import { Ledger } from './ledger.mjs';
import { reviewer, artefactInput, seed, sourceInput } from './fixtures.mjs';

const artefact = (id, text) => ({ id, body: { inventoryComplete: true, segments: [{ id: 'clause', state: 'available', text }] } });

test('hybrid discovery handles line breaks and nearby terms without losing exact evidence', () => {
  const documents = [artefact('wrap', 'Notify the incident\nowner.'), artefact('nearby', 'The owner of the incident must respond.')];
  const result = discoverHybrid(documents, { phrases: ['incident owner'] });
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.candidates[0].strategies, ['phrase']);
  assert.deepEqual(result.candidates[1].strategies, ['term_proximity']);
  for (const match of result.candidates) {
    const text = documents.find((doc) => doc.id === match.artefactId).body.segments[0].text;
    assert.equal(text.slice(match.evidence.start, match.evidence.end), match.evidence.quote);
  }
});

test('citation candidates require both instrument and provision and surface nearby exceptions', () => {
  const documents = [artefact('match', 'Except where excluded, section 24 of the Synthetic Act applies.'),
    artefact('wrong-section', 'Section 240 of the Synthetic Act.'), artefact('no-instrument', 'Section 24 applies.'),
    artefact('wrong-instrument', 'Section 24 of the Other Act.'), artefact('distant', `Synthetic Act ${'x'.repeat(500)} section 24`)];
  const query = { citations: [{ instrumentAliases: ['Synthetic Act'], provision: '24' }] };
  const result = discoverHybrid(documents, query);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].artefactId, 'match');
  assert.deepEqual(result.candidates[0].strategies, ['citation']);
  assert.deepEqual(result.candidates[0].reviewSignals, ['negation_or_exception_near_match']);
});

test('discovery limits report unsearched segments instead of treating them as clean negatives', () => {
  const documents = [artefact('large', 'incident owner '.repeat(5000)), artefact('small', 'incident owner')];
  for (const result of [discoverHybrid(documents, { phrases: ['incident owner'] }), discoverPhrases(documents, ['incident owner'])]) {
    assert.equal(result.unsearchedSegments, 1); assert.equal(result.truncated, true);
    assert.equal(result.candidates.length, 1); assert.equal(result.candidates[0].artefactId, 'small');
    assert.equal(result.discoveryRequired, true);
  }
});

test('hybrid mode retains matter filtering, current source checks and manual dependency review', (t) => {
  const ledger = new Ledger(); t.after(() => ledger.close());
  const { source, assertion } = seed(ledger);
  const privateActor = { ...reviewer, matterIds: ['hidden'] };
  ledger.addArtefact(privateActor, artefactInput({ key: 'secret', matterId: 'hidden' }));
  const result = ledger.discover(reviewer, assertion.id, { mode: 'hybrid', phrases: ['incident owner'] });
  assert.equal(result.candidates.length, 1);
  const candidate = result.candidates[0];
  const proposed = ledger.proposeDependency(reviewer, { ...candidate, assertionId: assertion.id, rationale: 'Candidate requires applicability review.' });
  assert.equal(ledger.coverage(reviewer, candidate.artefactId).segments[0].confirmedDependencies, 0);
  assert.equal(proposed.body.evidenceValid, true);
  ledger.addSource(reviewer, sourceInput({ expectedVersion: source.version, text: 'Changed source.' }));
  assert.throws(() => ledger.discover(reviewer, assertion.id, { mode: 'hybrid', phrases: ['incident owner'] }), /superseded/);
});
