import { MongoClient } from 'mongodb';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { categories, dishes, dishVariants, bills, billItems, expenses, salaries, salaryPayments } from '@/lib/db/schema';
import { saveUploadBuffer } from '@/lib/uploads';

// Downloads a dish image that used to be hosted remotely (Cloudinary) so it
// keeps working once this PC is offline. Best-effort — a failed download
// just leaves the dish without an image rather than aborting the import.
async function localizeImage(url: string | undefined | null): Promise<string | null> {
  if (!url || !url.startsWith('http')) return url ?? null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const mime = res.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());
    return saveUploadBuffer(buffer, mime);
  } catch (err) {
    console.error(`Failed to download image ${url}:`, err);
    return null;
  }
}

export interface MigrationResult {
  categories: number;
  dishes: number;
  bills: number;
  expenses: number;
  salaries: number;
}

// Pulls only this installation's exact department data out of the old MongoDB
// and into the local SQLite database. The old 3-department model let a record
// be tagged 'Both' and shared across Restaurant and Bakery — that no longer
// applies: each install is its own separate department, so a 'Both' record is
// NOT pulled into every install automatically. If an item is genuinely needed
// in both, it has to be added manually in each installation separately. Users
// are intentionally NOT migrated — each installation gets fresh admin/staff
// credentials via the Setup Wizard.
export async function migrateFromMongo(uri: string, department: 'Restaurant' | 'Bakery'): Promise<MigrationResult> {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  const result: MigrationResult = { categories: 0, dishes: 0, bills: 0, expenses: 0, salaries: 0 };

  try {
    await client.connect();
    const mongo = client.db();
    const deptFilter = { department };

    // Categories
    const mongoCategories = await mongo.collection('categories').find(deptFilter).toArray();
    for (const c of mongoCategories) {
      const existing = db.select().from(categories).all().find((row) => row.name.toLowerCase() === String(c.name).toLowerCase());
      if (!existing) {
        db.insert(categories).values({ name: c.name }).run();
        result.categories++;
      }
    }

    // Dishes (+ variants) — skip any dish already pulled in by a previous import run.
    const mongoDishes = await mongo.collection('dishes').find(deptFilter).toArray();
    for (const d of mongoDishes) {
      const sourceId = String(d._id);
      if (db.select().from(dishes).where(eq(dishes.sourceId, sourceId)).get()) continue;

      const localImageUrl = await localizeImage(d.imageUrl);
      const inserted = db
        .insert(dishes)
        .values({
          name: d.name,
          category: d.category ?? 'common',
          imageUrl: localImageUrl,
          isAvailable: d.isAvailable !== false,
          sourceId,
        })
        .returning({ id: dishes.id })
        .get();

      for (const v of d.variants ?? []) {
        db.insert(dishVariants).values({ dishId: inserted.id, label: v.label, price: v.price }).run();
      }
      result.dishes++;
    }

    // Bills (+ items) — same exact-department-only rule as everything else above.
    const mongoBills = await mongo.collection('bills').find(deptFilter).toArray();
    for (const b of mongoBills) {
      const sourceId = String(b._id);
      if (db.select().from(bills).where(eq(bills.sourceId, sourceId)).get()) continue;

      const inserted = db
        .insert(bills)
        .values({
          subtotal: b.subtotal,
          orderType: b.orderType ?? 'Dine-In',
          isDeleted: !!b.isDeleted,
          deletionReason: b.deletionReason ?? null,
          deletedAt: b.deletedAt ? new Date(b.deletedAt).toISOString() : null,
          createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
          sourceId,
        })
        .returning({ id: bills.id })
        .get();

      for (const item of b.items ?? []) {
        db.insert(billItems)
          .values({
            billId: inserted.id,
            dishName: item.dishName,
            variantLabel: item.variantLabel,
            price: item.price,
            qty: item.qty,
          })
          .run();
      }
      result.bills++;
    }

    // Expenses — old model's department was optional; include department-less (shared) rows too.
    const mongoExpenses = await mongo
      .collection('expenses')
      .find({ $or: [{ department }, { department: { $exists: false } }] })
      .toArray();
    for (const e of mongoExpenses) {
      const sourceId = String(e._id);
      if (db.select().from(expenses).where(eq(expenses.sourceId, sourceId)).get()) continue;

      db.insert(expenses)
        .values({
          description: e.description,
          amount: e.amount,
          category: e.category ?? 'Miscellaneous',
          date: e.date ? new Date(e.date).toISOString() : new Date().toISOString(),
          createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : new Date().toISOString(),
          sourceId,
        })
        .run();
      result.expenses++;
    }

    // Salaries (+ payment installments) — not department-scoped in the old model, so import all.
    const mongoSalaries = await mongo.collection('salaries').find({}).toArray();
    for (const s of mongoSalaries) {
      const sourceId = String(s._id);
      if (db.select().from(salaries).where(eq(salaries.sourceId, sourceId)).get()) continue;

      const inserted = db
        .insert(salaries)
        .values({
          staffName: s.staffName,
          month: s.month,
          year: s.year,
          totalAmount: s.totalAmount ?? null,
          status: s.status ?? 'paid',
          createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
          sourceId,
        })
        .returning({ id: salaries.id })
        .get();

      const payments = s.payments?.length ? s.payments : s.amount && s.paidAt ? [{ amount: s.amount, paidAt: s.paidAt, notes: s.notes }] : [];
      for (const p of payments) {
        db.insert(salaryPayments)
          .values({
            salaryId: inserted.id,
            amount: p.amount,
            paidAt: new Date(p.paidAt).toISOString(),
            notes: p.notes ?? null,
          })
          .run();
      }
      result.salaries++;
    }

    return result;
  } finally {
    // client.close() has been observed to hang on some networks (lingering
    // driver heartbeat sockets) — never let that block the API response once
    // the actual data work above is done.
    await Promise.race([client.close(), new Promise((resolve) => setTimeout(resolve, 5000))]);
  }
}
