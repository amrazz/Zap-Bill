import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => text('created_at').notNull().$defaultFn(() => new Date().toISOString());

export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey().default(1),
  department: text('department', { enum: ['Restaurant', 'Bakery'] }).notNull(),
  sessionSecret: text('session_secret').notNull(),
  // Physical width of the receipt printer's paper, in mm. Adjustable from
  // Settings so a wrong assumption (e.g. a 58mm printer instead of 80mm) can
  // be fixed on-site with a test print, without a new build/install.
  printerWidthMm: integer('printer_width_mm').notNull().default(80),
});

export const users = sqliteTable('users', {
  id: id(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role', { enum: ['admin', 'staff'] }).notNull().default('staff'),
  createdAt: createdAt(),
});

export const categories = sqliteTable('categories', {
  id: id(),
  name: text('name').notNull().unique(),
  createdAt: createdAt(),
});

export const dishes = sqliteTable('dishes', {
  id: id(),
  name: text('name').notNull(),
  category: text('category').notNull().default('common'),
  imageUrl: text('image_url'),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  createdAt: createdAt(),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  // Original MongoDB _id, set only when this row came from the migration tool —
  // lets a re-run of the import skip rows it already brought in instead of duplicating them.
  sourceId: text('source_id').unique(),
});

export const dishVariants = sqliteTable('dish_variants', {
  id: id(),
  dishId: text('dish_id').notNull().references(() => dishes.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  price: real('price').notNull(),
});

export const bills = sqliteTable('bills', {
  id: id(),
  subtotal: real('subtotal').notNull(),
  orderType: text('order_type', { enum: ['Dine-In', 'Takeaway', 'Delivery'] }).notNull().default('Dine-In'),
  // A single flat surcharge for the whole order, only meaningful for Takeaway —
  // added on top of the item subtotal, not folded into any item's price.
  takeawayCharge: real('takeaway_charge').notNull().default(0),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  deletionReason: text('deletion_reason'),
  deletedAt: text('deleted_at'),
  createdAt: createdAt(),
  sourceId: text('source_id').unique(),
});

export const billItems = sqliteTable('bill_items', {
  id: id(),
  billId: text('bill_id').notNull().references(() => bills.id, { onDelete: 'cascade' }),
  dishName: text('dish_name').notNull(),
  variantLabel: text('variant_label').notNull(),
  price: real('price').notNull(),
  qty: integer('qty').notNull(),
});

export const expenses = sqliteTable('expenses', {
  id: id(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  category: text('category', {
    enum: ['Rent', 'Electricity', 'Supplies', 'Maintenance', 'Miscellaneous'],
  }).notNull().default('Miscellaneous'),
  paymentMethod: text('payment_method', { enum: ['Cash', 'Online'] }).notNull().default('Cash'),
  date: text('date').notNull(),
  createdAt: createdAt(),
  sourceId: text('source_id').unique(),
});

export const salaries = sqliteTable('salaries', {
  id: id(),
  staffName: text('staff_name').notNull(),
  month: text('month').notNull(),
  year: integer('year').notNull(),
  totalAmount: real('total_amount'),
  status: text('status', { enum: ['partial', 'paid'] }).notNull().default('paid'),
  createdAt: createdAt(),
  sourceId: text('source_id').unique(),
});

export const salaryPayments = sqliteTable('salary_payments', {
  id: id(),
  salaryId: text('salary_id').notNull().references(() => salaries.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method', { enum: ['Cash', 'Online'] }).notNull().default('Cash'),
  paidAt: text('paid_at').notNull(),
  notes: text('notes'),
});

export const dailyClosings = sqliteTable('daily_closings', {
  id: id(),
  date: text('date').notNull().unique(), // 'yyyy-MM-dd'
  // Typed in by the admin from the physical ledger book at closing time — the
  // system can't know the real cash/online split itself: payment happens after
  // the bill is printed, and some small/off-menu sales are never billed at all.
  cashReceived: real('cash_received').notNull(),
  onlineReceived: real('online_received').notNull(),
  totalSales: real('total_sales').notNull(),
  cashExpenses: real('cash_expenses').notNull(),
  onlineExpenses: real('online_expenses').notNull(),
  totalExpenses: real('total_expenses').notNull(),
  cashSalaryPaid: real('cash_salary_paid').notNull(),
  onlineSalaryPaid: real('online_salary_paid').notNull(),
  totalSalaryPaid: real('total_salary_paid').notNull(),
  netCashInDrawer: real('net_cash_in_drawer').notNull(),
  netOnline: real('net_online').notNull(),
  netOverall: real('net_overall').notNull(),
  billCount: integer('bill_count').notNull(),
  expenseCount: integer('expense_count').notNull(),
  salaryPaymentCount: integer('salary_payment_count').notNull(),
  notes: text('notes'),
  closedBy: text('closed_by').notNull(),
  closedAt: text('closed_at').notNull(),
  createdAt: createdAt(),
});

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    department TEXT NOT NULL,
    session_secret TEXT NOT NULL,
    printer_width_mm INTEGER NOT NULL DEFAULT 80
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dishes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'common',
    image_url TEXT,
    is_available INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    source_id TEXT UNIQUE
  );
  CREATE TABLE IF NOT EXISTS dish_variants (
    id TEXT PRIMARY KEY,
    dish_id TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    price REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_dish_variants_dish_id ON dish_variants(dish_id);
  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    subtotal REAL NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'Dine-In',
    takeaway_charge REAL NOT NULL DEFAULT 0,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deletion_reason TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    source_id TEXT UNIQUE
  );
  CREATE TABLE IF NOT EXISTS bill_items (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    dish_name TEXT NOT NULL,
    variant_label TEXT NOT NULL,
    price REAL NOT NULL,
    qty INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
  CREATE INDEX IF NOT EXISTS idx_bill_items_dish_name ON bill_items(dish_name);
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL DEFAULT 'Miscellaneous',
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    source_id TEXT UNIQUE
  );
  CREATE TABLE IF NOT EXISTS salaries (
    id TEXT PRIMARY KEY,
    staff_name TEXT NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    total_amount REAL,
    status TEXT NOT NULL DEFAULT 'paid',
    created_at TEXT NOT NULL,
    source_id TEXT UNIQUE
  );
  CREATE TABLE IF NOT EXISTS salary_payments (
    id TEXT PRIMARY KEY,
    salary_id TEXT NOT NULL REFERENCES salaries(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    paid_at TEXT NOT NULL,
    notes TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_salary_payments_salary_id ON salary_payments(salary_id);
  CREATE TABLE IF NOT EXISTS daily_closings (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    cash_received REAL NOT NULL,
    online_received REAL NOT NULL,
    total_sales REAL NOT NULL,
    cash_expenses REAL NOT NULL,
    online_expenses REAL NOT NULL,
    total_expenses REAL NOT NULL,
    cash_salary_paid REAL NOT NULL,
    online_salary_paid REAL NOT NULL,
    total_salary_paid REAL NOT NULL,
    net_cash_in_drawer REAL NOT NULL,
    net_online REAL NOT NULL,
    net_overall REAL NOT NULL,
    bill_count INTEGER NOT NULL,
    expense_count INTEGER NOT NULL,
    salary_payment_count INTEGER NOT NULL,
    notes TEXT,
    closed_by TEXT NOT NULL,
    closed_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;
