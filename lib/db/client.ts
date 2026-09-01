import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';
import { CREATE_TABLES_SQL, appSettings } from './schema';

const DEPARTMENT = (process.env.APP_DEPARTMENT === 'Bakery' ? 'Bakery' : 'Restaurant') as 'Restaurant' | 'Bakery';

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'zapbill.db');

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.exec(CREATE_TABLES_SQL);

// CREATE TABLE IF NOT EXISTS doesn't retroactively add columns to a database
// created before source_id existed — add it by hand for upgrades.
for (const table of ['dishes', 'bills', 'expenses', 'salaries']) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === 'source_id')) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN source_id TEXT;`);
    sqlite.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_source_id ON ${table}(source_id);`);
  }
}

export const db = drizzle(sqlite, { schema });

// Ensure a single app_settings row exists (department locked at first run, session secret generated once).
const existingSettings = sqlite.prepare('SELECT * FROM app_settings WHERE id = 1').get() as
  | { id: number; department: string; session_secret: string }
  | undefined;

if (!existingSettings) {
  sqlite
    .prepare('INSERT INTO app_settings (id, department, session_secret) VALUES (1, ?, ?)')
    .run(DEPARTMENT, crypto.randomUUID() + crypto.randomUUID());
}

export function getAppSettings(): { department: 'Restaurant' | 'Bakery'; sessionSecret: string } {
  const row = sqlite.prepare('SELECT department, session_secret as sessionSecret FROM app_settings WHERE id = 1').get() as {
    department: 'Restaurant' | 'Bakery';
    sessionSecret: string;
  };
  return row;
}

export function hasAdminUser(): boolean {
  const row = sqlite.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
  return row.count > 0;
}

export function closeDb() {
  sqlite.close();
}

export { appSettings };
