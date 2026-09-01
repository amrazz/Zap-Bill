// Type-only imports — erased entirely at compile time, so they can never
// trigger loading the native addon (see the note on init() below for why
// that matters). Note that `drizzle-orm/better-sqlite3` itself does a static
// `require("better-sqlite3")` at its own top level, so importing *it*
// eagerly is just as unsafe here as importing `better-sqlite3` directly —
// both the driver and the native module have to be loaded dynamically.
import type Database from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';
import { CREATE_TABLES_SQL, appSettings } from './schema';

const DEPARTMENT = (process.env.APP_DEPARTMENT === 'Bakery' ? 'Bakery' : 'Restaurant') as 'Restaurant' | 'Bakery';

type DB = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

let sqlite: Database.Database | null = null;
let drizzleDb: DB | null = null;

// Opens the SQLite file and runs setup/migrations on first real use — never at
// module-import time. `next build` loads every API route (including this file,
// transitively) in parallel workers just to inspect their exports. A *static*
// import of `better-sqlite3` (directly, or transitively via
// `drizzle-orm/better-sqlite3`, which itself does `require("better-sqlite3")`
// at its own top level) forces Node to load (dlopen) the native addon the
// instant this file is imported, regardless of when the constructor is
// actually called. Several build workers loading the same native .node
// binary into their own process concurrently is exactly what was crashing
// the Windows build with a native access violation. Dynamic `require()`s
// here instead defer loading both the driver and the native module until an
// API route genuinely runs, which never happens during the build.
function init(): Database.Database {
  if (sqlite) return sqlite;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DatabaseCtor: typeof Database = require('better-sqlite3');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require('drizzle-orm/better-sqlite3') as typeof import('drizzle-orm/better-sqlite3');

  const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'zapbill.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  sqlite = new DatabaseCtor(dbPath);
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
export const db = new Proxy({} as DB, {
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
