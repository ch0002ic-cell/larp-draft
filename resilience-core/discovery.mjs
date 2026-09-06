const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const maxSearchCharacters = 2 * 1024 * 1024;
const maxSegmentCharacters = 65536;

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
  let searchedCharacters = 0; let unsearchedSegments = 0;
  for (const artefact of artefacts) {
    for (const segment of artefact.body.segments) {
      if (segment.state !== 'available') { gaps++; continue; }
      available++;
      if (segment.text.length > maxSegmentCharacters || searchedCharacters + segment.text.length > maxSearchCharacters) {
        unsearchedSegments++; continue;
      }
      searchedCharacters += segment.text.length;
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
    truncated: candidates.length > limit || unsearchedSegments > 0, availableSegments: available, unavailableSegments: gaps,
    unsearchedSegments, searchedCharacters,
    incompleteInventories: artefacts.filter((a) => !a.body.inventoryComplete).length,
    discoveryRequired: true, caveat: 'Phrase matches are candidates, not legal findings. No hit does not clear a document.' };
}

// A broader deterministic candidate baseline. Scores rank text matches only;
// citation proximity does not establish legal applicability or correct citation.
export function discoverHybrid(artefacts, { phrases = [], citations = [], limit = 250 }) {
  if (!Array.isArray(phrases) || !Array.isArray(citations) || phrases.length + citations.length === 0
    || phrases.length > 50 || citations.length > 20) throw new Error('Invalid discovery query');
  const validText = (value) => typeof value === 'string' && value.trim() && value.length <= 200;
  if (phrases.some((phrase) => !validText(phrase)) || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error('Invalid discovery query');
  const phraseQueries = phrases.map((phrase) => ({
    pattern: new RegExp(phrase.trim().split(/\s+/u).map(escapePattern).join('\\s+'), 'iu'),
    tokens: [...new Set((phrase.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []))],
  }));
  const citationQueries = citations.map((citation) => {
    if (!citation || !Array.isArray(citation.instrumentAliases) || !citation.instrumentAliases.length
      || citation.instrumentAliases.length > 10 || citation.instrumentAliases.some((alias) => !validText(alias))
      || !validText(citation.provision) || !/^[\dA-Za-z().-]+$/.test(citation.provision)) throw new Error('Invalid citation query');
    return { instruments: citation.instrumentAliases.map((alias) => new RegExp(`(?<![\\p{L}\\p{N}])${escapePattern(alias)}(?![\\p{L}\\p{N}])`, 'giu')),
      provision: new RegExp(`(?<![\\p{L}\\p{N}])(?:section|sec\\.?|s\\.?)\\s*${escapePattern(citation.provision)}(?![\\p{L}\\p{N}])`, 'giu') };
  });
  let available = 0; let gaps = 0; let searchedCharacters = 0; let unsearchedSegments = 0;
  const candidates = [];
  for (const artefact of artefacts) for (const segment of artefact.body.segments) {
    if (segment.state !== 'available') { gaps++; continue; }
    available++;
    if (segment.text.length > maxSegmentCharacters || searchedCharacters + segment.text.length > maxSearchCharacters) {
      unsearchedSegments++; continue;
    }
    searchedCharacters += segment.text.length;
    const text = segment.text; const hits = [];
    const words = [...text.matchAll(/[\p{L}\p{N}]+/gu)].map((match) => ({ text: match[0].toLowerCase(), start: match.index, end: match.index + match[0].length }));
    for (const query of phraseQueries) {
      const phrase = query.pattern.exec(text);
      if (phrase) hits.push({ start: phrase.index, end: phrase.index + phrase[0].length, strategy: 'phrase', score: 5 });
      else if (query.tokens.length >= 2 && query.tokens.length <= 8) {
        for (let index = 0; index < words.length; index++) {
          if (!query.tokens.includes(words[index].text)) continue;
          const window = words.slice(index, index + 8);
          if (query.tokens.every((token) => window.some((word) => word.text === token))) {
            const matching = window.filter((word) => query.tokens.includes(word.text));
            hits.push({ start: words[index].start, end: matching.at(-1).end, strategy: 'term_proximity', score: 2 });
            break;
          }
        }
      }
    }
    for (const query of citationQueries) {
      const provisions = [...text.matchAll(query.provision)];
      const instruments = query.instruments.flatMap((pattern) => [...text.matchAll(pattern)]).sort((a, b) => a.index - b.index);
      let match;
      let instrumentIndex = 0;
      for (const provision of provisions) {
        while (instruments[instrumentIndex]?.index < provision.index - 400) instrumentIndex++;
        const instrument = instruments[instrumentIndex];
        if (instrument && Math.abs(instrument.index - provision.index) <= 400) { match = { start: Math.min(instrument.index, provision.index),
          end: Math.max(instrument.index + instrument[0].length, provision.index + provision[0].length), strategy: 'citation', score: 8 }; break; }
      }
      if (match) hits.push(match);
    }
    if (!hits.length) continue;
    hits.sort((a, b) => b.score - a.score || a.start - b.start);
    const best = hits[0];
    const context = text.slice(Math.max(0, best.start - 100), best.end + 100);
    candidates.push({ artefactId: artefact.id, segmentId: segment.id, discovery: 'lexical',
      strategies: [...new Set(hits.map((hit) => hit.strategy))], score: best.score,
      reviewSignals: /\b(?:no|not|never|except|unless)\b/iu.test(context) ? ['negation_or_exception_near_match'] : [],
      evidence: { start: best.start, end: best.end, quote: text.slice(best.start, best.end) } });
  }
  candidates.sort((a, b) => b.score - a.score || a.artefactId.localeCompare(b.artefactId) || a.segmentId.localeCompare(b.segmentId));
  return { queryVersion: 'deterministic-hybrid-v1', candidates: candidates.slice(0, limit), matchedSegments: candidates.length,
    truncated: candidates.length > limit || unsearchedSegments > 0, availableSegments: available, unavailableSegments: gaps,
    unsearchedSegments, searchedCharacters,
    incompleteInventories: artefacts.filter((a) => !a.body.inventoryComplete).length, discoveryRequired: true,
    caveat: 'Deterministic candidate retrieval, not semantic inference or legal assessment. Citation proximity and negation flags require review.' };
}
