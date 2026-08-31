import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class Journal {
  private db: DatabaseSync;
  constructor(baseDir = join(process.cwd(), '.bridge')) {
    mkdirSync(baseDir, { recursive: true });
    this.db = new DatabaseSync(join(baseDir, 'journal.db'));
    this.db.exec(`CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY, ts TEXT NOT NULL, intent TEXT, target TEXT, adapter TEXT,
      risk TEXT, approval TEXT, before_state TEXT, operation TEXT, after_state TEXT,
      verified INTEGER, result TEXT, error TEXT
    )`);
  }
  write(entry: any) {
    const stmt = this.db.prepare(`INSERT OR REPLACE INTO actions
      (id,ts,intent,target,adapter,risk,approval,before_state,operation,after_state,verified,result,error)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    stmt.run(entry.id, new Date().toISOString(), entry.intent ?? '', JSON.stringify(entry.target ?? {}), entry.adapter ?? '',
      entry.risk ?? '', JSON.stringify(entry.approval ?? {}), JSON.stringify(entry.beforeState ?? null), entry.operation ?? '',
      JSON.stringify(entry.afterState ?? null), entry.verified ? 1 : 0, JSON.stringify(entry.result ?? null), JSON.stringify(entry.error ?? null));
  }
  recent(limit = 50) { return this.db.prepare('SELECT * FROM actions ORDER BY ts DESC LIMIT ?').all(limit); }
}
