import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { extractDocument } from './document-extraction.mjs';
function scan(text = '') {
  const canvas = createCanvas(1000, 150), context = canvas.getContext('2d');
  context.fillStyle = 'white'; context.fillRect(0, 0, 1000, 150);
  context.fillStyle = 'black'; context.font = '40px sans-serif'; context.fillText(text, 30, 85);
  return canvas.toBuffer('image/png');
}
test('local English OCR transcribes a synthetic scan and preserves review gaps and model provenance', async () => {
  const result = await extractDocument(scan('Notify the owner within 30 days.'), { mediaType: 'image/png', ocr: true });
  assert.equal(result.segments[0].state, 'available', JSON.stringify(result));
  assert.match(result.segments[0].text, /owner within 30 days/i);
  assert.equal(result.inventoryComplete, false);
  assert.equal(result.segments[1].state, 'excluded');
  assert.match(result.provenance.ocr.modelHash, /^[a-f0-9]{64}$/);
  assert.equal(result.provenance.ocr.observations[0].segmentId, 'image-1');
});
test('OCR is opt-in; blank, oversized, malformed and timed-out images cannot become complete', async () => {
  const bytes = scan();
  assert.equal((await extractDocument(bytes, { mediaType: 'image/png' })).segments[0].state, 'failed');
  const blank = await extractDocument(bytes, { mediaType: 'image/png', ocr: true });
  assert.equal(blank.segments[0].state, 'failed');
  const oversized = Buffer.from(bytes); oversized.writeUInt32BE(100000, 16);
  for (const input of [oversized, Buffer.from('invalid')]) {
    const result = await extractDocument(input, { mediaType: 'image/png', ocr: true });
    assert.equal(result.segments[0].state, 'failed'); assert.equal(result.inventoryComplete, false);
  }
  const timeout = await extractDocument(bytes, { mediaType: 'image/png', ocr: true }, { timeoutMs: 1 });
  assert.match(timeout.segments[0].reason, /timed out/);
});
test('PDF OCR limits empty-page processing and retains every extraction gap', async () => {
  const { makePdf } = await import('./document-fixtures.mjs');
  const result = await extractDocument(makePdf(['', '', '', '']), { mediaType: 'application/pdf', ocr: true });
  assert.equal(result.inventoryComplete, false);
  assert.equal(result.provenance.ocr.observations.length, 3, JSON.stringify(result));
  assert.equal(result.segments.filter((segment) => segment.id.startsWith('page-')).length, 4);
  assert.ok(result.segments.filter((segment) => segment.id.startsWith('page-')).every((segment) => segment.state === 'failed'));
});
