import { readFileSync } from 'node:fs';
import { Ledger } from './ledger.mjs';
import { createMicrosoftRuntime } from './microsoft-runtime.mjs';

// No browser/server is started. Tokens and secrets are read only from environment.
process.umask(0o077);
const command = process.argv[2];
const allowed = ['check-config', 'execute', 'import', 'publish', 'reconcile'];
if (!allowed.includes(command)) throw new Error(`Usage: node microsoft-cli.mjs ${allowed.join('|')} (JSON input on stdin)`);
let ledger;
try {
  if (!process.env.LARP_MICROSOFT_CONFIG || !process.env.LARP_LEDGER_PATH) throw new Error('Missing configuration');
  const config = JSON.parse(readFileSync(process.env.LARP_MICROSOFT_CONFIG, 'utf8'));
  ledger = new Ledger(process.env.LARP_LEDGER_PATH);
  const runtime = createMicrosoftRuntime({ ledger, config, clientSecret: process.env.LARP_ENTRA_CLIENT_SECRET });
  if (command === 'check-config') {
    console.log(JSON.stringify({ configurationValid: true, liveConnectionTested: false }));
  } else {
    const credential = process.env.LARP_ACCESS_TOKEN;
    if (!credential) throw new Error('Missing access token');
    const raw = readFileSync(0);
    if (raw.length > 1024 * 1024) throw new Error('Request exceeds limit');
    const input = JSON.parse(raw.toString('utf8'));
    const result = command === 'execute' ? await runtime.execute(credential, input.operation, ...(input.args ?? []))
      : command === 'import' ? await runtime.importSharePoint(credential, input)
        : command === 'publish' ? await runtime.publish(credential, input.jobId)
          : await runtime.reconcile(credential, input.jobId, input.reason);
    console.log(JSON.stringify(result, null, 2));
  }
} catch {
  // Provider error bodies may contain sensitive claims challenges or URLs.
  console.error('Operation failed. Check local configuration, access, evidence versions and job status.');
  process.exitCode = 1;
} finally { ledger?.close(); }
