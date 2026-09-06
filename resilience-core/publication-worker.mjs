// Backend orchestration only; connect must validate credentials and refresh ACLs.
// No token, preauthenticated URL or provider error body is written to the ledger.
export function createPublicationWorker({ ledger, connect, adapterFor }) {
  const actorFrom = (context) => {
    const access = context.access;
    if (!access?.active || !Number.isSafeInteger(context.identity?.expiresAt) || context.identity.expiresAt <= Date.now()
      || context.identity?.subject !== access.subject || context.identity?.tenantId !== access.tenantId) throw new Error('Access denied');
    return { tenantId: access.tenantId, userId: access.userId, roles: access.roles, matterIds: access.matterIds };
  };
  return Object.freeze({
    async run(credential, jobId) {
      let context = await connect(credential);
      const actor = actorFrom(context);
      const job = ledger.claimPublication(actor, jobId);
      if (job.body.status.startsWith('published')) return job;
      let receipt;
      try {
        // Refresh authorization after claiming; do not retain a cached actor in a queue.
        context = await connect(credential);
        const current = actorFrom(context);
        if (current.userId !== actor.userId || current.tenantId !== actor.tenantId) throw new Error('Access denied');
        const item = ledger.publicationInput(current, job.id);
        receipt = await adapterFor(context).replaceText(item.target, {
          expectedETag: item.target.eTag, expectedHash: item.target.hash,
          text: item.afterText, artefactType: item.artefactType,
        });
      } catch (error) {
        // Updating the failure record also requires fresh access. If denied, the
        // durable running record remains for an authorized reviewer to reconcile.
        const fresh = actorFrom(await connect(credential));
        return ledger.finishPublication(fresh, job.id, { leaseId: job.body.leaseId,
          failure: error.publicationMayHaveOccurred ? 'reconciliation_required' : error.retryable ? 'retryable' : 'blocked',
          retryAfterMs: error.retryAfterMs ?? 0 });
      }
      // A lost acknowledgement leaves a running job; it must not trigger another write.
      const fresh = actorFrom(await connect(credential));
      return ledger.finishPublication(fresh, job.id, { leaseId: job.body.leaseId, receipt });
    },
    async reconcile(credential, jobId, reason) {
      const context = await connect(credential);
      const actor = actorFrom(context);
      const job = ledger.get(actor, jobId, 'publication');
      const changeSet = ledger.getChangeSet(actor, job.body.changeSetId);
      const item = changeSet.body.items[job.body.index];
      if (!actor.roles.includes('reviewer') || item.owner !== actor.userId) throw new Error('Owner and reviewer authority required');
      const observed = await adapterFor(context).read(item.target);
      const fresh = actorFrom(await connect(credential));
      return ledger.reconcilePublication(fresh, job.id, { observedETag: observed.eTag, observedHash: observed.hash, reason });
    },
  });
}
