const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Evidence-backed, deterministic phrase baseline. Terms are reviewed search inputs,
// not an assertion that matching text is legally affected.
export function discoverPhrases(artefacts, phrases, limit = 250) {
  if (!Array.isArray(phrases) || !phrases.length || phrases.length > 50
    || phrases.some((s) => typeof s !== 'string' || !s.trim() || s.length > 200)) {
    throw new Error('Provide 1–50 nonempty phrases of at most 200 characters');
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error('Invalid discovery limit');
  const patterns = [...new Set(phrases)].map((phrase) => new RegExp(escapePattern(phrase), 'iu'));
  const candidates = [];
  let available = 0;
  let gaps = 0;
  for (const artefact of artefacts) {
    for (const segment of artefact.body.segments) {
      if (segment.state !== 'available') { gaps++; continue; }
      available++;
      const hits = patterns.map((pattern) => pattern.exec(segment.text)).filter(Boolean);
      if (!hits.length) continue;
      hits.sort((a, b) => a.index - b.index || b[0].length - a[0].length);
      const hit = hits[0];
      candidates.push({ artefactId: artefact.id, segmentId: segment.id, discovery: 'lexical',
        evidence: { start: hit.index, end: hit.index + hit[0].length, quote: hit[0] }, matchedPhrases: hits.length });
    }
  }
  candidates.sort((a, b) => b.matchedPhrases - a.matchedPhrases
    || a.artefactId.localeCompare(b.artefactId) || a.segmentId.localeCompare(b.segmentId));
  return { candidates: candidates.slice(0, limit), matchedSegments: candidates.length,
    truncated: candidates.length > limit, availableSegments: available, unavailableSegments: gaps,
    incompleteInventories: artefacts.filter((a) => !a.body.inventoryComplete).length,
    discoveryRequired: true, caveat: 'Phrase matches are candidates, not legal findings. No hit does not clear a document.' };
}
