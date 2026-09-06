import { parentPort, workerData } from 'node:worker_threads';
import { fromBufferPromise } from 'yauzl';
import { SaxesParser } from 'saxes';
import { crc32 } from 'node:zlib';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// Parsing never follows links, fetches document resources or evaluates document
// scripts. Worker limits contain ordinary failures; they are not an OS sandbox.
globalThis.fetch = async () => { throw new Error('Parser network access disabled'); };
const maxExpanded = 8 * 1024 * 1024;
const maxOutput = 2 * 1024 * 1024;
const require = createRequire(import.meta.url);
const docxParser = `yauzl@${require('yauzl/package.json').version}+saxes@${require('saxes/package.json').version}`;
const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const strictWordNamespace = 'http://purl.oclc.org/ooxml/wordprocessingml/main';
const wordTag = (node) => [wordNamespace, strictWordNamespace].includes(node.uri);
const isWordPart = (name) => /^word\/(document|footnotes|endnotes|comments|header\d*|footer\d*)\.xml$/.test(name);

function parseXml(xml, { textPart = false } = {}) {
  const parser = new SaxesParser({ xmlns: true });
  const stack = []; const output = []; const gaps = new Set();
  let outputLength = 0; let rootSeen = false;
  const append = (text) => {
    outputLength += Buffer.byteLength(text);
    if (outputLength > maxOutput) throw new Error('XML output limit exceeded');
    output.push(text);
  };
  parser.on('doctype', () => { throw new Error('DTD is not permitted'); });
  parser.on('error', () => { throw new Error('Invalid XML'); });
  parser.on('opentag', (node) => {
    if (!rootSeen && textPart && !wordTag(node)) throw new Error('Unsupported Word namespace');
    rootSeen = true;
    stack.push(node);
    if (node.local === 'Relationship' && Object.values(node.attributes).some((a) => a.local === 'TargetMode' && a.value === 'External')) {
      gaps.add('External relationships were not followed');
    }
    if (!wordTag(node)) return;
    if (['del', 'ins', 'moveFrom', 'moveTo'].includes(node.local)) gaps.add('Tracked changes require reviewer resolution');
    if (['drawing', 'pict', 'object', 'altChunk'].includes(node.local)) gaps.add('Embedded or alternate content requires extraction/review');
    if (['instrText', 'fldChar', 'fldSimple', 'vanish'].includes(node.local)) gaps.add('Fields or hidden text require reviewer inspection');
    if (node.local === 'tab') append('\t');
    if (['br', 'cr'].includes(node.local)) append('\n');
  });
  const text = (value) => {
    const node = stack.at(-1);
    if (node && wordTag(node) && ['t', 'delText'].includes(node.local)) append(value);
  };
  parser.on('text', text); parser.on('cdata', text);
  parser.on('closetag', (node) => {
    if (wordTag(node)) {
      if (['p', 'tr'].includes(node.local)) append('\n');
      if (node.local === 'tc') append('\t');
    }
    stack.pop();
  });
  parser.write(xml).close();
  return { text: output.join(''), gaps: [...gaps] };
}

async function docx(bytes) {
  const zip = await fromBufferPromise(Buffer.from(bytes), { lazyEntries: true, validateEntrySizes: true, strictFileNames: true });
  const segments = []; const seen = new Set(); let expanded = 0; let output = 0; let main = false;
  try {
    for await (const entry of zip.eachEntry()) {
      if (seen.size >= 256 || seen.has(entry.fileName.toLowerCase())) throw new Error('Ambiguous or oversized package inventory');
      seen.add(entry.fileName.toLowerCase());
      expanded += entry.uncompressedSize;
      if (expanded > maxExpanded || (entry.generalPurposeBitFlag & 1) || ![0, 8].includes(entry.compressionMethod)) {
        throw new Error('Unsupported or oversized package entry');
      }
      if (entry.fileName.endsWith('/')) continue;
      if (!isWordPart(entry.fileName) && !entry.fileName.endsWith('.rels')) {
        // Metadata/styles are not legal text; non-text/unknown parts stay visible.
        if (!/^\[Content_Types\]\.xml$|^docProps\/|^word\/(styles|settings|numbering|fontTable|webSettings)\.xml$|^word\/theme\//.test(entry.fileName)) {
          segments.push({ id: entry.fileName, state: 'excluded', reason: 'Package part was not extracted; embedded/alternate content may require review' });
        }
        continue;
      }
      const stream = await zip.openReadStreamPromise(entry);
      const chunks = []; let length = 0; let crc = 0;
      for await (const chunk of stream) {
        length += chunk.length;
        if (length > maxExpanded) throw new Error('Expanded part limit exceeded');
        crc = crc32(chunk, crc); chunks.push(chunk);
      }
      if (crc !== entry.crc32) throw new Error('Package integrity error');
      const parsed = parseXml(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)), { textPart: isWordPart(entry.fileName) });
      if (entry.fileName === 'word/document.xml') main = true;
      if (isWordPart(entry.fileName)) {
        output += Buffer.byteLength(parsed.text);
        if (output > maxOutput) throw new Error('Package text limit exceeded');
        segments.push(parsed.text.trim() ? { id: entry.fileName, state: 'available', text: parsed.text }
          : { id: entry.fileName, state: 'failed', reason: 'No text extracted from this Word part' });
      }
      parsed.gaps.forEach((reason, index) => segments.push({ id: `${entry.fileName}:gap-${index + 1}`, state: 'excluded', reason }));
    }
    if (!main) throw new Error('Missing Word document part');
    segments.push({ id: 'document-review', state: 'excluded',
      reason: 'Layout, numbering, styles, revision meaning and attachment completeness require review; part text is not a rendered Word view' });
    return { inventoryComplete: false, segments, provenance: { parser: docxParser, packageEntries: seen.size, expandedBytes: expanded } };
  } finally { zip.close(); }
}

let ocrWorker;
let ocrCalls = 0;
let ocrProvenance;
const maxPixels = 5_000_000;
async function recognizePng(bytes, id) {
  const data = Buffer.from(bytes);
  if (data.length < 33 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
    || data.toString('ascii', 12, 16) !== 'IHDR') throw new Error('PNG required');
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
  if (!width || !height || width * height > maxPixels) throw new Error('OCR pixel limit');
  if (++ocrCalls > 3) return { id, state: 'failed', reason: 'OCR limited to three images/pages per import' };
  if (!ocrWorker) {
    const { createWorker } = await import('tesseract.js');
    const language = require('@tesseract.js-data/eng');
    const model = await readFile(join(language.langPath, 'eng.traineddata.gz'));
    ocrProvenance = { engine: `tesseract.js@${require('tesseract.js/package.json').version}`,
      language: 'eng', modelHash: createHash('sha256').update(model).digest('hex'), observations: [] };
    ocrWorker = await createWorker('eng', 1, { langPath: language.langPath, gzip: true,
      cacheMethod: 'none', logger: () => {}, errorHandler: () => {} });
  }
  const { data: result } = await ocrWorker.recognize(data);
  ocrProvenance.observations.push({ segmentId: id, confidence: result.confidence, width, height });
  if (Buffer.byteLength(result.text) > maxOutput) throw new Error('OCR text limit');
  return result.text.trim() ? { id, state: 'available', text: result.text }
    : { id, state: 'failed', reason: 'OCR returned no text; reviewer inspection required' };
}
async function imageDocument(bytes) {
  const segment = await recognizePng(bytes, 'image-1');
  return { inventoryComplete: false, segments: [segment, { id: 'document-review', state: 'excluded',
    reason: 'English OCR is unverified transcription; inspect original image, omissions, layout and attachments' }],
    provenance: { ocr: ocrProvenance } };
}

async function pdf(bytes) {
  const { getDocument, version } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: bytes, useWorkerFetch: false, useWasm: false, stopAtErrors: true,
    enableXfa: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  try {
    const document = await task.promise;
    const segments = []; let output = 0;
    const count = Math.min(document.numPages, 200);
    for (let index = 1; index <= count; index++) {
      let page;
      try {
        page = await document.getPage(index);
        const content = await page.getTextContent({ disableNormalization: true });
        let text = content.items.filter((item) => typeof item.str === 'string')
          .map((item) => item.str + (item.hasEOL ? '\n' : ' ')).join('');
        output += Buffer.byteLength(text);
        if (output > maxOutput) throw new Error('Output limit');
        if (!text.trim() && workerData.ocr && ocrCalls < 3) {
          const viewport = page.getViewport({ scale: 2 });
          if (Math.ceil(viewport.width) * Math.ceil(viewport.height) > maxPixels) throw new Error('OCR pixel limit');
          const { createCanvas } = await import('@napi-rs/canvas');
          const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          const segment = await recognizePng(canvas.toBuffer('image/png'), `page-${index}`);
          output += Buffer.byteLength(segment.text ?? '');
          if (output > maxOutput) throw new Error('Output limit');
          segments.push(segment);
        } else {
          segments.push(text.trim() ? { id: `page-${index}`, state: 'available', text }
            : { id: `page-${index}`, state: 'failed', reason: 'No text extracted; OCR disabled, budget exhausted or reviewer inspection required' });
        }
      } catch {
        segments.push({ id: `page-${index}`, state: 'failed', reason: 'Page extraction failed or exceeded the text budget' });
      } finally { page?.cleanup(); }
      if (output > maxOutput) {
        if (index < document.numPages) segments.push({ id: 'unprocessed-pages', state: 'failed', reason: `${document.numPages - index} remaining pages were not processed after the text budget was reached` });
        break;
      }
    }
    if (document.numPages > count && output <= maxOutput) segments.push({ id: 'unprocessed-pages', state: 'failed', reason: `${document.numPages - count} pages exceed the 200-page limit` });
    segments.push({ id: 'document-review', state: 'excluded',
      reason: 'Visual layout, graphics, annotations, forms and embedded attachments were not interpreted; extracted text order and any OCR transcription require review' });
    return { inventoryComplete: false, segments, provenance: { parser: `pdfjs-dist@${version}`, pageCount: document.numPages, ...(ocrProvenance ? { ocr: ocrProvenance } : {}) } };
  } finally { await task.destroy(); }
}

if (parentPort) {
  try {
    parentPort.postMessage(await (workerData.mediaType === 'application/pdf' ? pdf(workerData.bytes) : workerData.mediaType === 'image/png' ? imageDocument(workerData.bytes) : docx(workerData.bytes)));
  } catch {
    parentPort.postMessage({ failure: 'Invalid, encrypted, unsupported or over-budget document; extraction requires review' });
  } finally { await ocrWorker?.terminate(); }
}
