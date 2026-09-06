import { DatabaseSync, backup } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdtempSync, linkSync, rmSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Operator-only utilities. Never expose backup paths through the user service.
export function verifyLedgerFile(path) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const schema = db.prepare('PRAGMA user_version').get().user_version;
    if (![1, 2].includes(schema)) throw new Error('Unsupported backup schema');
    const integrity = db.prepare('PRAGMA integrity_check').all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok'
      || db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Invalid backup integrity');
    const records = db.prepare('SELECT body,hash FROM records').all();
    for (const record of records) {
      JSON.parse(record.body);
      if (createHash('sha256').update(record.body).digest('hex') !== record.hash) throw new Error('Record hash mismatch');
    }
    const counts = Object.fromEntries(['records', 'decisions', 'events'].map((table) => [table,
      db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]));
    return { integrity: 'ok', schema, ...counts };
  } finally { db.close(); }
}

// Use SQLite's backup API so a WAL-backed database is captured consistently.
// Publish with an exclusive hard link: an existing destination is never replaced.
export async function snapshotLedger(sourcePath, newDestinationPath) {
  const directory = mkdtempSync(join(dirname(newDestinationPath), '.larp-snapshot-'));
  chmodSync(directory, 0o700);
  const temporary = join(directory, 'snapshot.sqlite');
  let source;
  try {
    source = new DatabaseSync(sourcePath, { readOnly: true });
    const pages = await backup(source, temporary);
    chmodSync(temporary, 0o600);
    const verified = verifyLedgerFile(temporary);
    linkSync(temporary, newDestinationPath);
    return { ...verified, pages };
  } finally { source?.close(); rmSync(directory, { recursive: true, force: true }); }
}

// Restore to a new path; point the application at it only after reviewing any
// interrupted publication jobs against the external destination.
export const restoreLedger = snapshotLedger;
