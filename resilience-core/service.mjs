// Server-side boundary. Supply trusted session and permission adapters at startup.
// This module neither implements login nor accepts actors from request payloads.
const operations = new Set([
  'get', 'list', 'addSource', 'addAssertion', 'addArtefact', 'proposeDependency',
  'reviewDependency', 'proposeAssessment', 'getAssessment', 'reviewAssessment',
  'coverage', 'planSourceChange', 'audit',
  'ingestText', 'discover',
  'proposeChangeSet', 'getChangeSet', 'reviewChangeSet', 'reviewOwnership',
]);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const denied = () => { throw new Error('Access denied'); };

export function createLedgerService({ ledger, verifySession, resolveAccess, now = Date.now }) {
  if (!ledger || typeof verifySession !== 'function' || typeof resolveAccess !== 'function'
    || typeof now !== 'function') throw new TypeError('Trusted adapters required');

  return Object.freeze({
    async execute(credential, operation, ...args) {
      if (!operations.has(operation)) throw new Error('Unsupported operation');
      // Snapshot inputs before asynchronous identity resolution to prevent mutation
      // of a queued operation by its caller while permission checks are pending.
      const inputs = structuredClone(args);
      let actor;
      try {
        const session = await verifySession(credential);
        if (!session || !nonempty(session.subject) || !nonempty(session.tenantId)
          || !Number.isSafeInteger(session.expiresAt) || session.expiresAt <= now()) denied();
        const identity = Object.freeze({ subject: session.subject, tenantId: session.tenantId });
        const expiresAt = session.expiresAt;
        const access = await resolveAccess(identity, { credential });
        if (!access || access.active !== true || access.subject !== identity.subject
          || access.tenantId !== identity.tenantId || !nonempty(access.userId)
          || !nonempty(access.aclVersion) || !Array.isArray(access.roles)
          || !access.roles.every((role) => ['reader', 'editor', 'reviewer'].includes(role))
          || !Array.isArray(access.matterIds) || !access.matterIds.every(nonempty)
          || expiresAt <= now()) denied();
        actor = Object.freeze({ tenantId: identity.tenantId, userId: access.userId,
          roles: Object.freeze([...new Set(access.roles)]),
          matterIds: Object.freeze([...new Set(access.matterIds)]) });
      } catch {
        // Do not expose provider failures, membership or session details.
        denied();
      }
      // No await between the access snapshot and the synchronous ledger operation.
      // Provider-side revocation consistency remains the resolver's responsibility.
      return ledger[operation](actor, ...inputs);
    },
  });
}
