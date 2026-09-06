import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCorpus } from './evaluate.mjs';

test('evaluation keeps missing evidence in recall and does not invent finding precision', () => {
  const result = evaluateCorpus({ syntheticOnly: true, phrases: ['owner'], cases: [
    { id: 'a', family: 'a', relevant: true, severe: false, text: 'owner' },
    { id: 'b', family: 'b', relevant: true, severe: true, text: null },
    { id: 'c', family: 'c', relevant: false, severe: false, text: 'owner' },
    { id: 'd', family: 'd', relevant: false, severe: false, text: 'fees' },
  ] });
  assert.deepEqual(result.dependencyRecall, { numerator: 1, denominator: 2, value: 0.5 });
  assert.deepEqual(result.candidatePrecision, { numerator: 1, denominator: 2, value: 0.5 });
  assert.deepEqual(result.severeMisses, ['b']); assert.equal(result.abstentions, 1);
  assert.equal(result.findingPrecision, null); assert.equal(result.pilotGate, 'not_evaluated');
});

test('evaluation rejects duplicate IDs and family leakage; zero denominator stays undefined', () => {
  const base = { id: 'a', family: 'same', relevant: false, severe: false, text: 'fees' };
  assert.throws(() => evaluateCorpus({ phrases: ['owner'], cases: [base, base] }), /Invalid/);
  assert.throws(() => evaluateCorpus({ phrases: ['owner'], cases: [base, { ...base, id: 'b', partition: 'train' }] }), /family/);
  const result = evaluateCorpus({ phrases: ['owner'], cases: [base] });
  assert.equal(result.dependencyRecall.value, null); assert.equal(result.candidatePrecision.value, null);
});
