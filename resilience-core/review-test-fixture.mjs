import { Ledger } from './ledger.mjs';
import { LocalDocumentStore } from './local-document-store.mjs';
import { prepareWorkflow, syntheticActor, syntheticConnect } from './workflow-fixtures.mjs';
import { createPublicationWorker } from './publication-worker.mjs';

export function demoRuntime() {
  const ledger = new Ledger(':memory:'), store = new LocalDocumentStore();
  prepareWorkflow(ledger, store);
  const worker = createPublicationWorker({ ledger, connect: syntheticConnect, adapterFor: () => store });
  return { execute: async (_credential, operation, ...args) => ledger[operation](syntheticActor, ...args),
    publish: worker.run, reconcile: worker.reconcile, close: () => { ledger.close(); store.close(); } };
}
