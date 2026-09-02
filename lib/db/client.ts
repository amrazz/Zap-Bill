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

  // Same story for takeaway_charge on bills — added after some databases
  // already existed.
  const billCols = sqlite.prepare(`PRAGMA table_info(bills)`).all() as { name: string }[];
  if (!billCols.some((c) => c.name === 'takeaway_charge')) {
    sqlite.exec(`ALTER TABLE bills ADD COLUMN takeaway_charge REAL NOT NULL DEFAULT 0;`);
  }

  // Same story for printer_width_mm on app_settings — added after some
  // databases already existed.
  const appSettingsCols = sqlite.prepare(`PRAGMA table_info(app_settings)`).all() as { name: string }[];
  if (!appSettingsCols.some((c) => c.name === 'printer_width_mm')) {
    sqlite.exec(`ALTER TABLE app_settings ADD COLUMN printer_width_mm INTEGER NOT NULL DEFAULT 80;`);
  }

  // Salaries used to get a new row per payment for the same staff member
  // (grouped by month), which made the same person show up as several cards.
  // Consolidate any duplicate rows sharing a name (case/whitespace-insensitive)
  // into one, moving every payment onto the surviving row. Idempotent — once
  // consolidated, this is a no-op on every subsequent launch.
  type SalaryRow = { id: string; staff_name: string; total_amount: number | null; created_at: string };
  const allSalaryRows = sqlite.prepare('SELECT id, staff_name, total_amount, created_at FROM salaries').all() as SalaryRow[];
  const salaryGroups = new Map<string, SalaryRow[]>();
  for (const row of allSalaryRows) {
    const key = row.staff_name.trim().toLowerCase();
    const group = salaryGroups.get(key);
    if (group) group.push(row);
    else salaryGroups.set(key, [row]);
  }
  for (const rows of salaryGroups.values()) {
    if (rows.length <= 1) continue;
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const [canonical, ...duplicates] = rows;
    for (const dup of duplicates) {
      sqlite.prepare('UPDATE salary_payments SET salary_id = ? WHERE salary_id = ?').run(canonical.id, dup.id);
    }
    if (canonical.total_amount == null) {
      const withTotal = duplicates.find((d) => d.total_amount != null);
      if (withTotal) {
        sqlite.prepare('UPDATE salaries SET total_amount = ? WHERE id = ?').run(withTotal.total_amount, canonical.id);
        canonical.total_amount = withTotal.total_amount;
      }
    }
    sqlite
      .prepare(`DELETE FROM salaries WHERE id IN (${duplicates.map(() => '?').join(',')})`)
      .run(...duplicates.map((d) => d.id));

    const totalPaid = (sqlite.prepare('SELECT amount FROM salary_payments WHERE salary_id = ?').all(canonical.id) as { amount: number }[])
      .reduce((sum, p) => sum + p.amount, 0);
    const status = canonical.total_amount != null && totalPaid < canonical.total_amount ? 'partial' : 'paid';
    sqlite.prepare('UPDATE salaries SET status = ? WHERE id = ?').run(status, canonical.id);
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

export function getAppSettings(): { department: 'Restaurant' | 'Bakery'; sessionSecret: string; printerWidthMm: number } {
  const row = getSqlite()
    .prepare('SELECT department, session_secret as sessionSecret, printer_width_mm as printerWidthMm FROM app_settings WHERE id = 1')
    .get() as { department: 'Restaurant' | 'Bakery'; sessionSecret: string; printerWidthMm: number };
  return row;
}

export function setPrinterWidthMm(mm: number): void {
  getSqlite().prepare('UPDATE app_settings SET printer_width_mm = ? WHERE id = 1').run(mm);
}

export function hasAdminUser(): boolean {
  const row = getSqlite().prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
  return row.count > 0;
}

export function closeDb() {
  sqlite?.close();
}

export { appSettings };
