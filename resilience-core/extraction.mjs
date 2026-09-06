import { createHash } from 'node:crypto';

export const extractionVersion = 'utf8-text-v1';
export const maxInputBytes = 1024 * 1024;

// One explicitly declared text file, not a PDF/page/attachment extractor.
// Unsupported or failed inputs remain visible and never become empty successes.
export function extractText(bytes, { mediaType, attachmentsComplete = false }) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Byte input required');
  const contentHash = createHash('sha256').update(bytes).digest('hex');
  let reason;
  let text;
  if (bytes.byteLength > maxInputBytes) reason = 'Input exceeds the 1 MiB extraction limit';
  else if (mediaType !== 'text/plain') reason = 'Unsupported format; dedicated extraction or OCR required';
  else {
    try {
      text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
      if (!text.trim() || text.includes('\0')) reason = 'Empty or binary text input';
    } catch { reason = 'Invalid UTF-8'; }
  }
  return { extractionVersion, inventoryComplete: !reason && attachmentsComplete === true,
    segments: [reason ? { id: 'document', state: 'failed', reason }
      : { id: 'document', state: 'available', text }],
    provenance: { contentHash, byteLength: bytes.byteLength, mediaType, attachmentsComplete: attachmentsComplete === true } };
}
