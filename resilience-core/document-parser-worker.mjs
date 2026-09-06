import { parentPort, workerData } from 'node:worker_threads';
import { fromBufferPromise } from 'yauzl';
import { SaxesParser } from 'saxes';
import { crc32 } from 'node:zlib';
import { createRequire } from 'node:module';

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
        const text = content.items.filter((item) => typeof item.str === 'string')
          .map((item) => item.str + (item.hasEOL ? '\n' : ' ')).join('');
        output += Buffer.byteLength(text);
        if (output > maxOutput) throw new Error('Output limit');
        segments.push(text.trim() ? { id: `page-${index}`, state: 'available', text }
          : { id: `page-${index}`, state: 'failed', reason: 'No text extracted; blank page, scan or unsupported text requires OCR/review' });
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
      reason: 'Visual layout, graphics, annotations, forms and embedded attachments were not interpreted; extracted text order requires review' });
    return { inventoryComplete: false, segments, provenance: { parser: `pdfjs-dist@${version}`, pageCount: document.numPages } };
  } finally { await task.destroy(); }
}

if (parentPort) {
  try {
    parentPort.postMessage(await (workerData.mediaType === 'application/pdf' ? pdf(workerData.bytes) : docx(workerData.bytes)));
  } catch {
    parentPort.postMessage({ failure: 'Invalid, encrypted, unsupported or over-budget document; extraction requires review' });
  }
}
