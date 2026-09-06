import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { extractDocument, docxMediaType } from './document-extraction.mjs';
import { makeZip, makePdf, wordXml, simpleDocx } from './document-fixtures.mjs';
import { Ledger } from './ledger.mjs';
import { createLedgerService } from './service.mjs';
import { reviewer, artefactInput } from './fixtures.mjs';

test('DOCX extraction includes body tables, footnotes and headers with stable part anchors', async () => {
  const bytes = makeZip([
    { name: 'word/document.xml', text: wordXml('<w:body><w:p><w:r><w:t>Clause α &amp; β.</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Table duty</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body>') },
    { name: 'word/footnotes.xml', text: wordXml('<w:footnote><w:p><w:r><w:t>Except emergencies.</w:t></w:r></w:p></w:footnote>', 'footnotes') },
    { name: 'word/header1.xml', text: wordXml('<w:p><w:r><w:t>Draft header</w:t></w:r></w:p>', 'hdr') },
  ]);
  const result = await extractDocument(bytes, { mediaType: docxMediaType, attachmentsComplete: true });
  assert.equal(result.provenance.contentHash, createHash('sha256').update(bytes).digest('hex'));
  assert.match(result.segments.find((s) => s.id === 'word/document.xml').text, /Clause α & β\.[\s\S]*Table duty/);
  assert.match(result.segments.find((s) => s.id === 'word/footnotes.xml').text, /Except emergencies/);
  assert.match(result.segments.find((s) => s.id === 'word/header1.xml').text, /Draft header/);
  assert.equal(result.inventoryComplete, false);
  assert.ok(result.segments.some((s) => s.id === 'document-review' && s.state === 'excluded'));
});

test('tracked changes, fields, embedded parts and external relationships stay explicit', async () => {
  const bytes = makeZip([
    { name: 'word/document.xml', text: wordXml('<w:body><w:p><w:del><w:r><w:delText>Old duty</w:delText></w:r></w:del><w:ins><w:r><w:t>New duty</w:t></w:r></w:ins><w:fldSimple w:instr="DATE"/></w:p></w:body>') },
    { name: 'word/media/image1.png', text: 'synthetic image placeholder' },
    { name: 'word/_rels/document.xml.rels', text: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="https://example.invalid/never-fetch" TargetMode="External"/></Relationships>' },
  ]);
  const result = await extractDocument(bytes, { mediaType: docxMediaType });
  assert.match(result.segments[0].text, /Old dutyNew duty/);
  const reasons = result.segments.map((s) => s.reason ?? '').join('\n');
  assert.match(reasons, /Tracked changes/); assert.match(reasons, /Fields/); assert.match(reasons, /External relationships/);
  assert.equal(result.segments.find((s) => s.id === 'word/media/image1.png').state, 'excluded');
});

test('DTD, corrupt CRC, traversal, duplicate parts, encryption and expansion limits fail visibly', async () => {
  const standard = { name: 'word/document.xml', text: wordXml('<w:p><w:r><w:t>Text</w:t></w:r></w:p>') };
  const examples = [
    [{ ...standard, text: '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>' }],
    [{ ...standard, crc: 1 }], [{ ...standard, name: '../word/document.xml' }], [standard, standard],
    [{ ...standard, encrypted: true }], [{ ...standard, text: 'x'.repeat(9 * 1024 * 1024), deflate: true }],
  ];
  for (const entries of examples) {
    const result = await extractDocument(makeZip(entries), { mediaType: docxMediaType });
    assert.equal(result.segments[0].state, 'failed'); assert.equal(result.inventoryComplete, false);
  }
});

test('PDF extraction inventories pages and retains no-text pages as OCR/review gaps', async () => {
  const result = await extractDocument(makePdf(['First page duty.', null, 'Third page exception.']), { mediaType: 'application/pdf' });
  assert.equal(result.provenance.pageCount, 3);
  assert.match(result.segments[0].text, /First page duty/);
  assert.equal(result.segments[1].state, 'failed'); assert.match(result.segments[1].reason, /OCR/);
  assert.match(result.segments[2].text, /Third page exception/);
  assert.equal(result.inventoryComplete, false);
});

test('invalid PDFs and parser deadlines never produce empty successful artefacts', async () => {
  const corrupt = await extractDocument(Buffer.from('%PDF-corrupt'), { mediaType: 'application/pdf' });
  assert.equal(corrupt.segments[0].state, 'failed');
  const timed = await extractDocument(makePdf(), { mediaType: 'application/pdf' }, { timeoutMs: 1 });
  assert.equal(timed.segments[0].state, 'failed'); assert.match(timed.segments[0].reason, /timed out/);
});

test('PDF page caps retain the number of pages left unprocessed', async () => {
  const result = await extractDocument(makePdf(Array.from({ length: 201 }, () => null)), { mediaType: 'application/pdf' });
  assert.equal(result.provenance.pageCount, 201);
  assert.equal(result.segments.filter((segment) => segment.id.startsWith('page-')).length, 200);
  assert.match(result.segments.find((segment) => segment.id === 'unprocessed-pages').reason, /1 pages exceed/);
});

test('rich-document ingestion refreshes permissions after parsing and preserves coverage', async (t) => {
  const ledger = new Ledger(); t.after(() => ledger.close());
  let calls = 0; let revoke = false;
  const service = createLedgerService({ ledger,
    verifySession: async () => ({ subject: 'user', tenantId: reviewer.tenantId, expiresAt: Date.now() + 60000 }),
    resolveAccess: async () => {
      calls++;
      return { active: true, subject: 'user', ...reviewer, aclVersion: String(calls),
        matterIds: revoke && calls % 2 === 0 ? [] : reviewer.matterIds };
    } });
  const input = { ...artefactInput(), bytes: simpleDocx(), mediaType: docxMediaType };
  const imported = await service.execute('synthetic', 'ingestDocument', input);
  assert.equal(imported.body.segments[0].id, 'word/document.xml'); assert.equal(calls, 2);
  revoke = true;
  await assert.rejects(service.execute('synthetic', 'ingestDocument', { ...input, key: 'revoked' }), /Forbidden/);
  assert.equal(ledger.list(reviewer, 'artefact').length, 1);
});

test('an identity change during extraction cannot move evidence into another tenant', async (t) => {
  const ledger = new Ledger(); t.after(() => ledger.close());
  let checks = 0;
  const service = createLedgerService({ ledger,
    verifySession: async () => ({ subject: 'user', tenantId: ++checks === 1 ? reviewer.tenantId : 'another-tenant', expiresAt: Date.now() + 60000 }),
    resolveAccess: async (identity) => ({ ...reviewer, ...identity, active: true, aclVersion: '1' }) });
  await assert.rejects(service.execute('synthetic', 'ingestDocument', {
    ...artefactInput(), bytes: simpleDocx(), mediaType: docxMediaType }), /Access denied/);
  assert.equal(ledger.list(reviewer, 'artefact').length, 0);
  assert.equal(ledger.list({ ...reviewer, tenantId: 'another-tenant' }, 'artefact').length, 0);
});
