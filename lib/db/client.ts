import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';
import { CREATE_TABLES_SQL, appSettings } from './schema';

const DEPARTMENT = (process.env.APP_DEPARTMENT === 'Bakery' ? 'Bakery' : 'Restaurant') as 'Restaurant' | 'Bakery';

let sqlite: Database.Database | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

// Opens the SQLite file and runs setup/migrations on first real use — never at
// module-import time. `next build` loads every API route (including this file,
// transitively) in parallel workers just to inspect their exports; if opening
// the native database were a side effect of importing this file, multiple
// build workers would race to open/create the same file simultaneously, which
// is exactly what was crashing the Windows build with a native access
// violation. Runtime code always goes through getDb()/getSqlite() below, so
// the real database is only ever touched once an API route actually runs.
function init(): Database.Database {
  if (sqlite) return sqlite;

  const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'zapbill.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  sqlite = new Database(dbPath);
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

  // Ensure a single app_settings row exists (department locked at first run, session secret generated once).
  const existingSettings = sqlite.prepare('SELECT * FROM app_settings WHERE id = 1').get() as
    | { id: number; department: string; session_secret: string }
    | undefined;

  if (!existingSettings) {
    sqlite
      .prepare('INSERT INTO app_settings (id, department, session_secret) VALUES (1, ?, ?)')
      .run(DEPARTMENT, crypto.randomUUID() + crypto.randomUUID());
  }

  drizzleDb = drizzle(sqlite, { schema });
  return sqlite;
}

function getSqlite(): Database.Database {
  return init();
}

// A Proxy so every existing call site (`db.select()`, `db.insert()`, etc.)
// keeps working unchanged, while the actual connection is created lazily on
// first property access instead of at import time.
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    init();
    return Reflect.get(drizzleDb as object, prop, receiver);
  },
});

export function getAppSettings(): { department: 'Restaurant' | 'Bakery'; sessionSecret: string } {
  const row = getSqlite().prepare('SELECT department, session_secret as sessionSecret FROM app_settings WHERE id = 1').get() as {
    department: 'Restaurant' | 'Bakery';
    sessionSecret: string;
  };
  return row;
}

export function hasAdminUser(): boolean {
  const row = getSqlite().prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
  return row.count > 0;
}

export function closeDb() {
  sqlite?.close();
}

export { appSettings };
