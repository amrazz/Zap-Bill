import { NextRequest, NextResponse } from 'next/server';
import { and, gte, lte, eq, like, inArray, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bills, billItems } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

function serializeBill(bill: typeof bills.$inferSelect, items: (typeof billItems.$inferSelect)[]) {
  return {
    _id: bill.id,
    subtotal: bill.subtotal,
    orderType: bill.orderType,
    takeawayCharge: bill.takeawayCharge,
    isDeleted: bill.isDeleted,
    deletionReason: bill.deletionReason,
    deletedAt: bill.deletedAt,
    createdAt: bill.createdAt,
    items: items.map((i) => ({ dishName: i.dishName, variantLabel: i.variantLabel, price: i.price, qty: i.qty })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status') || 'all';

    const conditions = [];

    if (session.role === 'admin') {
      if (status === 'active') conditions.push(eq(bills.isDeleted, false));
      else if (status === 'deleted') conditions.push(eq(bills.isDeleted, true));
    } else {
      conditions.push(eq(bills.isDeleted, false));
    }

    if (from) conditions.push(gte(bills.createdAt, new Date(from).toISOString()));
    if (to) conditions.push(lte(bills.createdAt, new Date(to).toISOString()));

    let matchingBillIds: string[] | null = null;
    if (search) {
      const searchStr = search.replace(/^ZB/i, '');
      const byItem = db.select({ billId: billItems.billId }).from(billItems).where(like(billItems.dishName, `%${search}%`)).all();
      matchingBillIds = byItem.map((r) => r.billId);
      // Bill IDs are UUIDs — matching by trailing snippet like the old ObjectId search did.
      if (/^[0-9a-fA-F-]+$/.test(searchStr)) {
        const allBills = db.select({ id: bills.id }).from(bills).all();
        matchingBillIds.push(...allBills.filter((b) => b.id.endsWith(searchStr)).map((b) => b.id));
      }
      if (matchingBillIds.length === 0) {
        return NextResponse.json({ bills: [], total: 0, pages: 0, currentPage: page, limit });
      }
      conditions.push(inArray(bills.id, matchingBillIds));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const total = db.select({ count: sql<number>`count(*)` }).from(bills).where(where).get()?.count ?? 0;
    const pageBills = db
      .select()
      .from(bills)
      .where(where)
      .orderBy(desc(bills.createdAt))
      .limit(limit)
      .offset((page - 1) * limit)
      .all();

    const allItems = pageBills.length
      ? db.select().from(billItems).where(inArray(billItems.billId, pageBills.map((b) => b.id))).all()
      : [];

    const result = pageBills.map((b) => serializeBill(b, allItems.filter((i) => i.billId === b.id)));

    return NextResponse.json({ bills: result, total, pages: Math.ceil(total / limit), currentPage: page, limit });
  } catch (error) {
    console.error('GET bills error:', error);
    return NextResponse.json({ error: 'Failed to fetch bills.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { items, orderType, takeawayCharge } = body;

    if (!items || items.length === 0 || !orderType) {
      return NextResponse.json({ error: 'Items and order type are required.' }, { status: 400 });
    }

    const rawItems = items as { dishName: string; variantLabel: string; price: number; qty: number }[];
    for (const item of rawItems) {
      if (!item.dishName || typeof item.price !== 'number' || item.price < 0 || typeof item.qty !== 'number' || item.qty <= 0) {
        return NextResponse.json({ error: 'One or more items in the order are invalid.' }, { status: 400 });
      }
    }
    if (takeawayCharge !== undefined && (typeof takeawayCharge !== 'number' || takeawayCharge < 0)) {
      return NextResponse.json({ error: 'Takeaway charge is invalid.' }, { status: 400 });
    }

    // The takeaway charge only ever applies to Takeaway orders — ignore any
    // stray value sent for other order types instead of trusting the client.
    const isTakeaway = orderType === 'Takeaway';
    const charge = isTakeaway ? takeawayCharge ?? 0 : 0;

    // Recompute the subtotal from the actual items server-side instead of trusting
    // whatever the client sent — the client value never gets persisted. The
    // takeaway charge is a separate flat add-on, not folded into the subtotal.
    const subtotal = Math.round(rawItems.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100;

    const bill = db.insert(bills).values({ subtotal, orderType, takeawayCharge: charge }).returning().get();
    const insertedItems = rawItems.map((item) =>
      db.insert(billItems).values({ billId: bill.id, ...item }).returning().get()
    );

    return NextResponse.json(serializeBill(bill, insertedItems), { status: 201 });
  } catch (error) {
    console.error('POST bill error:', error);
    return NextResponse.json({ error: 'Failed to save bill.' }, { status: 500 });
  }
}
