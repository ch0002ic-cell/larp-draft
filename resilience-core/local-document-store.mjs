import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

const hash = (text) => createHash('sha256').update(text).digest('hex');
const key = (target) => JSON.stringify([target.matterId, target.driveId, target.folderId, target.itemId]);

// Synthetic integration-test destination. Never a replacement for SharePoint ACLs.
export class LocalDocumentStore {
  #db;
  constructor(path = ':memory:') {
    this.#db = new DatabaseSync(path);
    this.#db.exec(`CREATE TABLE IF NOT EXISTS documents (
      target TEXT NOT NULL, version INTEGER NOT NULL, text TEXT NOT NULL,
      PRIMARY KEY(target,version)) STRICT;
      CREATE TRIGGER IF NOT EXISTS documents_no_update BEFORE UPDATE ON documents BEGIN SELECT RAISE(ABORT, 'Immutable version'); END;
      CREATE TRIGGER IF NOT EXISTS documents_no_delete BEFORE DELETE ON documents BEGIN SELECT RAISE(ABORT, 'Immutable version'); END;`);
  }
  close() { this.#db.close(); }
  seed(target, text) {
    this.#db.prepare('INSERT INTO documents VALUES(?,1,?)').run(key(target), text);
    return this.read(target);
  }
  read(target) {
    const row = this.#db.prepare('SELECT * FROM documents WHERE target=? ORDER BY version DESC LIMIT 1').get(key(target));
    if (!row) throw new Error('Target unavailable');
    return { bytes: Buffer.from(row.text), eTag: `"${row.version}"`, hash: hash(row.text), mediaType: 'text/plain' };
  }
  replaceText(target, { expectedETag, expectedHash, text, artefactType }) {
    if (['executed', 'control'].includes(artefactType)) throw new Error('Separate workflow required');
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const before = this.read(target);
      if (before.eTag !== expectedETag || before.hash !== expectedHash) throw new Error('Version conflict');
      const version = Number(JSON.parse(before.eTag)) + 1;
      this.#db.prepare('INSERT INTO documents VALUES(?,?,?)').run(key(target), version, text);
      this.#db.exec('COMMIT');
      return { itemId: target.itemId, beforeETag: before.eTag, afterETag: `"${version}"`, hash: hash(text) };
    } catch (error) { this.#db.exec('ROLLBACK'); throw error; }
  }
}
