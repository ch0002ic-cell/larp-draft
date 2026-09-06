import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const graphOrigin = 'https://graph.microsoft.com';
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const digest = (value) => createHash('sha256').update(value).digest('hex');
const requireValue = (ok, message = 'Invalid Microsoft configuration') => { if (!ok) throw new Error(message); };
const maxBytes = 1024 * 1024;

export class MicrosoftError extends Error {
  constructor(status, code = 'Microsoft request failed', retryAfterMs = 0) {
    super(code); this.status = status;
    this.retryable = status === 429 || status >= 500;
    this.retryAfterMs = retryAfterMs;
  }
}

async function boundedBytes(response, limit = maxBytes) {
  if (Number(response.headers.get('content-length')) > limit) throw new Error('Response exceeds size limit');
  const chunks = []; let size = 0;
  if (!response.body) return Buffer.alloc(0);
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > limit) throw new Error('Response exceeds size limit');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function request(fetchImpl, url, options = {}) {
  let response;
  try { response = await fetchImpl(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(15000) }); }
  catch { throw new MicrosoftError(503, 'Microsoft connection unavailable'); }
  if (!response.ok) {
    const retry = response.headers.get('retry-after');
    const delay = retry === null ? 0 : /^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now());
    throw new MicrosoftError(response.status, 'Microsoft request failed', Number.isFinite(delay) ? delay : 0);
  }
  return response;
}

export function createGraphClient(token, { fetchImpl = fetch } = {}) {
  requireValue(typeof token === 'string' && token.length > 0, 'Graph token required');
  return Object.freeze({
    async json(path, options = {}) {
      const url = new URL(path, `${graphOrigin}/v1.0/`);
      requireValue(url.origin === graphOrigin && !url.username && !url.password
        && url.pathname.startsWith('/v1.0/'), 'Untrusted Graph URL');
      const response = await request(fetchImpl, url, { ...options,
        headers: { ...options.headers, Authorization: `Bearer ${token}` } });
      return JSON.parse((await boundedBytes(response)).toString('utf8'));
    },
  });
}

export function createMicrosoftAdapters(config, { clientSecret, fetchImpl = fetch, jwks } = {}) {
  const settings = structuredClone(config);
  requireValue(guid.test(settings.tenantId) && guid.test(settings.clientId)
    && Array.isArray(settings.allowedClientIds) && settings.allowedClientIds.length > 0
    && settings.allowedClientIds.every((id) => guid.test(id))
    && typeof settings.scope === 'string' && settings.scope.length > 0
    && Array.isArray(settings.groupMappings) && settings.groupMappings.length > 0);
  for (const mapping of settings.groupMappings) {
    requireValue(guid.test(mapping.groupId) && Array.isArray(mapping.roles)
      && mapping.roles.every((r) => ['reader', 'editor', 'reviewer'].includes(r))
      && Array.isArray(mapping.matterIds) && mapping.matterIds.every((id) => typeof id === 'string' && id.trim()));
  }
  requireValue(typeof clientSecret === 'string' && clientSecret.length > 0, 'Microsoft client secret required');
  const issuer = `https://login.microsoftonline.com/${settings.tenantId}/v2.0`;
  const keys = jwks ?? createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${settings.tenantId}/discovery/v2.0/keys`),
    { timeoutDuration: 10000, cooldownDuration: 30000 });

  const verifySession = async (credential) => {
    requireValue(typeof credential === 'string' && credential.length < 32768, 'Invalid access token');
    const { payload } = await jwtVerify(credential, keys, { issuer, audience: settings.clientId,
      algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'nbf', 'oid', 'tid', 'azp', 'scp', 'ver'] });
    requireValue(payload.ver === '2.0' && payload.tid === settings.tenantId && guid.test(payload.oid)
      && settings.allowedClientIds.includes(payload.azp)
      && typeof payload.scp === 'string' && payload.scp.split(' ').includes(settings.scope), 'Invalid access token');
    return { subject: payload.oid, tenantId: payload.tid, expiresAt: payload.exp * 1000 };
  };

  const connect = async (credential) => {
    const identity = await verifySession(credential);
    const response = await request(fetchImpl, `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: settings.clientId, client_secret: clientSecret,
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', requested_token_use: 'on_behalf_of',
        assertion: credential, scope: 'https://graph.microsoft.com/.default' }).toString(),
    });
    const result = JSON.parse((await boundedBytes(response)).toString('utf8'));
    requireValue(result.token_type?.toLowerCase() === 'bearer' && typeof result.access_token === 'string', 'Token exchange failed');
    const graph = createGraphClient(result.access_token, { fetchImpl });
    const me = await graph.json('me?$select=id');
    requireValue(me.id === identity.subject, 'Delegated identity mismatch');
    const groups = new Set(); const visited = new Set();
    let path = 'me/transitiveMemberOf';
    while (path) {
      requireValue(!visited.has(path) && visited.size < 20, 'Membership pagination incomplete');
      visited.add(path);
      const page = await graph.json(path);
      requireValue(Array.isArray(page.value), 'Invalid membership response');
      for (const entry of page.value) {
        if (entry['@odata.type'] === '#microsoft.graph.group' && guid.test(entry.id)) groups.add(entry.id);
      }
      path = page['@odata.nextLink'];
      if (path) {
        const next = new URL(path);
        requireValue(next.origin === graphOrigin && next.pathname === '/v1.0/me/transitiveMemberOf', 'Untrusted membership continuation');
      }
    }
    const grants = settings.groupMappings.filter((mapping) => groups.has(mapping.groupId));
    const roles = [...new Set(grants.flatMap((grant) => grant.roles))].sort();
    const matterIds = [...new Set(grants.flatMap((grant) => grant.matterIds))].sort();
    requireValue(identity.expiresAt > Date.now() && grants.length > 0 && roles.length > 0, 'Access denied');
    const access = { active: true, ...identity, userId: identity.subject, roles, matterIds,
      aclVersion: digest(JSON.stringify({ roles, matterIds, mappings: settings.groupMappings })) };
    return { identity, access, graph };
  };

  return Object.freeze({ verifySession, connect,
    async resolveAccess(identity, { credential }) {
      const { access } = await connect(credential);
      requireValue(access.subject === identity.subject && access.tenantId === identity.tenantId, 'Access denied');
      return access;
    } });
}

// Only direct children of configured matter folders, using delegated Graph access.
// Upload/download URLs carry their own authorization: never send bearer tokens to them.
export function createSharePointAdapter({ graph, access, folders, transferHosts, fetchImpl = fetch }) {
  const allowed = structuredClone(folders);
  const hosts = new Set(transferHosts);
  const scope = structuredClone(access);
  const checkTarget = (target) => {
    const folder = allowed.find((entry) => entry.matterId === target.matterId && entry.driveId === target.driveId
      && entry.folderId === target.folderId);
    requireValue(folder && scope.active === true && scope.matterIds.includes(target.matterId), 'SharePoint target unavailable');
    requireValue(typeof target.itemId === 'string' && /^[\w!-]+$/.test(target.itemId), 'Invalid item ID');
    return `drives/${encodeURIComponent(folder.driveId)}/items/${encodeURIComponent(target.itemId)}`;
  };
  const transferUrl = (value) => {
    const url = new URL(value);
    requireValue(url.protocol === 'https:' && !url.username && !url.password && !url.port
      && hosts.has(url.hostname), 'Untrusted transfer URL');
    return url;
  };
  const read = async (target) => {
    const path = checkTarget(target);
    const metadata = await graph.json(path);
    requireValue(metadata.id === target.itemId && metadata.parentReference?.id === target.folderId
      && metadata.parentReference?.driveId === target.driveId && !metadata.remoteItem && metadata.file
      && typeof metadata.eTag === 'string' && Number.isSafeInteger(metadata.size) && metadata.size <= maxBytes,
    'Unsupported or relocated SharePoint item');
    const response = await request(fetchImpl, transferUrl(metadata['@microsoft.graph.downloadUrl']));
    const bytes = await boundedBytes(response);
    const after = await graph.json(path);
    requireValue(after.eTag === metadata.eTag && after.parentReference?.id === target.folderId
      && bytes.length === metadata.size, 'SharePoint item changed during read');
    return { bytes, eTag: metadata.eTag, hash: digest(bytes), name: metadata.name, mediaType: metadata.file.mimeType };
  };
  return Object.freeze({ read,
    async replaceText(target, { expectedETag, expectedHash, text, artefactType }) {
      requireValue(scope.roles.some((role) => ['editor', 'reviewer'].includes(role)), 'Forbidden');
      requireValue(['template', 'draft', 'checklist', 'playbook', 'advisory', 'training'].includes(artefactType),
        'Executed agreements and automated controls require a separate workflow');
      requireValue(typeof text === 'string' && text.trim() && Buffer.byteLength(text) <= maxBytes, 'Invalid replacement');
      const before = await read(target);
      requireValue(before.mediaType === 'text/plain' && before.eTag === expectedETag && before.hash === expectedHash,
        'SharePoint version conflict');
      const session = await graph.json(`${checkTarget(target)}/createUploadSession`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'If-Match': expectedETag },
        body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'fail' } }) });
      const bytes = Buffer.from(text);
      const uploadUrl = transferUrl(session.uploadUrl);
      try {
        const response = await request(fetchImpl, uploadUrl, { method: 'PUT',
          headers: { 'Content-Type': 'application/octet-stream', 'Content-Range': `bytes 0-${bytes.length - 1}/${bytes.length}` }, body: bytes });
        requireValue(response.status === 200 || response.status === 201, 'Upload incomplete; reconciliation required');
        const after = await read(target);
        requireValue(after.hash === digest(bytes), 'Publication verification failed');
        return { itemId: target.itemId, beforeETag: before.eTag, afterETag: after.eTag, hash: after.hash };
      } catch (error) {
        error.publicationMayHaveOccurred = true;
        throw error;
      }
    },
  });
}
