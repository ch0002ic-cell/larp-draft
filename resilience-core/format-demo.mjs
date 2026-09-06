import { Ledger } from './ledger.mjs';
import { createLedgerService } from './service.mjs';
import { docxMediaType } from './document-extraction.mjs';
import { makePdf, simpleDocx } from './document-fixtures.mjs';
import { reviewer, sourceInput, span } from './fixtures.mjs';

const ledger = new Ledger();
try {
  const service = createLedgerService({ ledger,
    verifySession: async () => ({ subject: 'synthetic-user', tenantId: reviewer.tenantId, expiresAt: Date.now() + 60000 }),
    resolveAccess: async () => ({ ...reviewer, subject: 'synthetic-user', active: true, aclVersion: 'synthetic-v1' }) });
  const source = ledger.addSource(reviewer, sourceInput());
  const assertion = ledger.addAssertion(reviewer, { key: 'synthetic-format-rule', expectedVersion: 0, sourceId: source.id,
    interpretation: 'Synthetic owner-notification example.', applicability: 'Only generated fixtures.', exceptions: 'Not real law.', evidence: span(source.body.text) });
  const documents = [];
  for (const [key, mediaType, bytes] of [['pdf', 'application/pdf', makePdf(['Notify the incident owner.', null])],
    ['docx', docxMediaType, simpleDocx()]]) {
    documents.push(await service.execute('synthetic', 'ingestDocument', { key, expectedVersion: 0,
      title: `Synthetic ${key.toUpperCase()}`, type: 'template', matterId: reviewer.matterIds[0], owner: reviewer.userId,
      bytes, mediaType, attachmentsComplete: true }));
  }
  const found = await service.execute('synthetic', 'discover', assertion.id, { mode: 'hybrid', phrases: ['incident owner'] });
  console.log(JSON.stringify({ syntheticOnly: true, networkCalls: 0,
    documents: documents.map((doc) => ({ key: doc.logical_key, parser: doc.body.provenance.parser,
      rawHash: doc.body.provenance.contentHash, inventoryComplete: doc.body.inventoryComplete,
      availableSegments: doc.body.segments.filter((s) => s.state === 'available').length,
      gaps: doc.body.segments.filter((s) => s.state !== 'available').map(({ id, state, reason }) => ({ id, state, reason })) })),
    candidates: found.candidates.length, discoveryRequired: found.discoveryRequired,
    caveat: 'Extracted text supports candidate review. OCR, visual layout and revision interpretation remain unresolved; no documents were cleared or published.' }, null, 2));
} finally { ledger.close(); }
