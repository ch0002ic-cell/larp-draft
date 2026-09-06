import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { discoverPhrases } from './discovery.mjs';

export function evaluateCorpus(corpus) {
  if (!Array.isArray(corpus.cases) || !corpus.cases.length) throw new Error('Labeled cases required');
  const ids = new Set(); const families = new Map();
  for (const entry of corpus.cases) {
    if (typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)
      || typeof entry.family !== 'string' || !entry.family || typeof entry.relevant !== 'boolean'
      || typeof entry.severe !== 'boolean' || (entry.text !== null && typeof entry.text !== 'string')) throw new Error('Invalid evaluation case');
    ids.add(entry.id);
    const partition = entry.partition ?? 'test';
    if (!['train', 'test'].includes(partition) || (families.has(entry.family) && families.get(entry.family) !== partition)) {
      throw new Error('Document family crosses training and test partitions');
    }
    families.set(entry.family, partition);
  }
  const cases = corpus.cases.filter((entry) => (entry.partition ?? 'test') === 'test');
  if (!cases.length) throw new Error('Held-out cases required');
  const started = performance.now();
  const artefacts = cases.map((entry) => ({ id: entry.id, body: { inventoryComplete: entry.text !== null,
    segments: [{ id: 'document', state: entry.text === null ? 'failed' : 'available', text: entry.text ?? '' }] } }));
  const found = discoverPhrases(artefacts, corpus.phrases, 1000);
  if (found.truncated) throw new Error('Evaluation exceeded retrieval limit');
  const retrieved = new Set(found.candidates.map((candidate) => candidate.artefactId));
  const truePositives = cases.filter((entry) => entry.relevant && retrieved.has(entry.id)).length;
  const falsePositives = cases.filter((entry) => !entry.relevant && retrieved.has(entry.id)).length;
  const falseNegatives = cases.filter((entry) => entry.relevant && !retrieved.has(entry.id)).length;
  const severeMisses = cases.filter((entry) => entry.relevant && entry.severe && !retrieved.has(entry.id)).map((entry) => entry.id);
  const ratio = (numerator, denominator) => ({ numerator, denominator, value: denominator ? numerator / denominator : null });
  return { syntheticOnly: corpus.syntheticOnly === true, corpusVersion: corpus.version ?? null, cases: cases.length,
    dependencyRecall: ratio(truePositives, truePositives + falseNegatives),
    candidatePrecision: ratio(truePositives, truePositives + falsePositives),
    findingPrecision: null, truePositives, falsePositives, falseNegatives, severeMisses,
    abstentions: cases.filter((entry) => entry.text === null).length,
    negativesWithoutMatch: cases.filter((entry) => !entry.relevant && !retrieved.has(entry.id)).length,
    elapsedMs: performance.now() - started, modelCalls: 0,
    pilotGate: 'not_evaluated',
    caveat: 'Candidate retrieval only. Synthetic results and unadjudicated labels do not establish legal accuracy or pilot readiness.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = process.argv[2] ?? new URL('./evaluation-corpus.json', import.meta.url);
  console.log(JSON.stringify(evaluateCorpus(JSON.parse(readFileSync(input, 'utf8'))), null, 2));
}
