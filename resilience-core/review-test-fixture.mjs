import { artefactInput } from './fixtures.mjs';
import { Ledger } from './ledger.mjs';
import { LocalDocumentStore } from './local-document-store.mjs';
import { prepareWorkflow, syntheticActor, syntheticConnect } from './workflow-fixtures.mjs';
import { createPublicationWorker } from './publication-worker.mjs';

export function demoRuntime() {
  const ledger = new Ledger(':memory:'), store = new LocalDocumentStore();
  prepareWorkflow(ledger, store);
  const target = { matterId: syntheticActor.matterIds[0], driveId: 'synthetic-drive', folderId: 'synthetic-folder', itemId: 'authoring-item' };
  const text = 'Notify the incident owner.', remote = store.seed(target, text);
  ledger.addArtefact(syntheticActor, artefactInput({ key: 'authoring-fixture', title: 'Synthetic authoring template',
    owner: syntheticActor.userId, segments: [{ id: 'document', state: 'available', text }],
    provenance: { remote: { ...target, eTag: remote.eTag, hash: remote.hash } } }));
  const worker = createPublicationWorker({ ledger, connect: syntheticConnect, adapterFor: () => store });
  return { execute: async (_credential, operation, ...args) => ledger[operation](syntheticActor, ...args),
    publish: worker.run, reconcile: worker.reconcile, close: () => { ledger.close(); store.close(); } };
}
