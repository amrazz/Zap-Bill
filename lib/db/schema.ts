import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => text('created_at').notNull().$defaultFn(() => new Date().toISOString());

export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey().default(1),
  department: text('department', { enum: ['Restaurant', 'Bakery'] }).notNull(),
  sessionSecret: text('session_secret').notNull(),
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
  paidAt: text('paid_at').notNull(),
  notes: text('notes'),
});

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    department TEXT NOT NULL,
    session_secret TEXT NOT NULL
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
    paid_at TEXT NOT NULL,
    notes TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_salary_payments_salary_id ON salary_payments(salary_id);
`;
