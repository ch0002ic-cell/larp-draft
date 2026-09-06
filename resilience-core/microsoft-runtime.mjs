import { createMicrosoftAdapters, createSharePointAdapter } from './microsoft.mjs';
import { createLedgerService } from './service.mjs';
import { createPublicationWorker } from './publication-worker.mjs';
import { extractDocument } from './document-extraction.mjs';

export function createMicrosoftRuntime({ ledger, config, clientSecret }, dependencies = {}) {
  const settings = structuredClone(config);
  if (!Array.isArray(settings.folders) || !settings.folders.length || !Array.isArray(settings.transferHosts)
    || !settings.transferHosts.length) throw new Error('Approved folders and transfer hosts required');
  const adapters = createMicrosoftAdapters(settings, { clientSecret, ...dependencies });
  const actorFrom = ({ access }) => ({ tenantId: access.tenantId, userId: access.userId,
    roles: access.roles, matterIds: access.matterIds });
  const connect = async (credential) => {
    const context = await adapters.connect(credential);
    const actor = actorFrom(context);
    const deniedMatters = new Set();
    // Conservative matter-level policy: if any retained artefact is no longer
    // readable in SharePoint, withhold that matter, including cached derivatives.
    // Check historical versions too; a move must not expose the old cached copy.
    const artefacts = ledger.list(actor, 'artefact');
    const checked = new Set();
    for (const artefact of artefacts) {
      const remote = artefact.body.provenance?.remote;
      const folder = settings.folders.find((entry) => entry.matterId === artefact.matter
        && entry.driveId === remote?.driveId && entry.folderId === remote?.folderId);
      if (!folder || remote.matterId !== artefact.matter) { deniedMatters.add(artefact.matter); continue; }
      const key = JSON.stringify([artefact.matter, remote.driveId, remote.folderId, remote.itemId]);
      if (checked.has(key)) continue;
      if (checked.size >= 500) throw new Error('Permission verification limit exceeded');
      checked.add(key);
      try {
        const metadata = await context.graph.json(`drives/${encodeURIComponent(remote.driveId)}/items/${encodeURIComponent(remote.itemId)}?$select=id,parentReference`);
        if (metadata.id !== remote.itemId || metadata.parentReference?.id !== remote.folderId
          || metadata.parentReference?.driveId !== remote.driveId) deniedMatters.add(artefact.matter);
      } catch (error) {
        if ([403, 404].includes(error.status)) deniedMatters.add(artefact.matter);
        else throw new Error('Permission verification unavailable');
      }
    }
    context.access = { ...context.access, matterIds: actor.matterIds.filter((id) => !deniedMatters.has(id)) };
    if (context.identity.expiresAt <= Date.now()) throw new Error('Access denied');
    return context;
  };
  const adapterFor = (context) => createSharePointAdapter({ ...context, folders: settings.folders,
    transferHosts: settings.transferHosts, fetchImpl: dependencies.fetchImpl });
  const worker = createPublicationWorker({ ledger, connect, adapterFor });
  return Object.freeze({
    async execute(credential, operation, ...args) {
      if (['addArtefact', 'ingestText', 'ingestDocument'].includes(operation)) throw new Error('Use verified SharePoint import');
      const inputs = structuredClone(args);
      const context = await connect(credential);
      const service = createLedgerService({ ledger, verifySession: adapters.verifySession,
        resolveAccess: async () => context.access });
      return service.execute(credential, operation, ...inputs);
    },
    async importSharePoint(credential, input) {
      const snapshot = structuredClone(input);
      const context = await connect(credential);
      const actor = actorFrom(context);
      if (!actor.roles.some((role) => ['editor', 'reviewer'].includes(role))
        || !actor.matterIds.includes(snapshot.target?.matterId)) throw new Error('Forbidden');
      const remote = await adapterFor(context).read(snapshot.target);
      const extracted = await extractDocument(remote.bytes, { mediaType: remote.mediaType, attachmentsComplete: snapshot.attachmentsComplete, ocr: snapshot.ocr === true });
      const fresh = await connect(credential);
      const current = actorFrom(fresh);
      const rechecked = await adapterFor(fresh).read(snapshot.target);
      if (rechecked.eTag !== remote.eTag || rechecked.hash !== remote.hash) throw new Error('SharePoint item changed during import');
      if (fresh.identity.expiresAt <= Date.now() || current.tenantId !== actor.tenantId || current.userId !== actor.userId) throw new Error('Access denied');
      extracted.provenance.remote = { ...snapshot.target, eTag: remote.eTag, hash: remote.hash };
      return ledger.addArtefact(current, { key: snapshot.key, expectedVersion: snapshot.expectedVersion,
        matterId: snapshot.target.matterId, title: snapshot.title, owner: snapshot.owner, type: snapshot.type,
        ...extracted });
    },
    publish: worker.run,
    reconcile: worker.reconcile,
  });
}
