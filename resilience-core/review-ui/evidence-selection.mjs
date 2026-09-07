// Textareas normalise CRLF/CR to LF. Map displayed selection offsets to immutable evidence.
export function evidenceSelection(text, start, end) {
  const offsets = [0];
  for (let index = 0; index < text.length;) {
    index += text[index] === '\r' && text[index + 1] === '\n' ? 2 : 1;
    offsets.push(index);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0
    || end <= start || end >= offsets.length) throw new Error('Select a passage from the document text.');
  return { start: offsets[start], end: offsets[end], quote: text.slice(offsets[start], offsets[end]) };
}
