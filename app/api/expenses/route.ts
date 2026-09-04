import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { format } from 'date-fns';
import { db, isDateClosed } from '@/lib/db/client';
import { expenses } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = db.select().from(expenses).orderBy(desc(expenses.date)).limit(100).all();
    return NextResponse.json(result.map(({ id, ...e }) => ({ _id: id, ...e })));
  } catch (error) {
    console.error('GET expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { description, amount, category, date, paymentMethod } = await request.json();

    if (!description) return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    if (amount === undefined || amount === null || amount === '') {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }
    if (!category) return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    if (paymentMethod !== undefined && paymentMethod !== 'Cash' && paymentMethod !== 'Online') {
      return NextResponse.json({ error: 'Payment method must be Cash or Online' }, { status: 400 });
    }

    const expenseDate = date ? new Date(date) : new Date();
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      return NextResponse.json({ error: 'Amount must be a number' }, { status: 400 });
    }

    if (isDateClosed(format(expenseDate, 'yyyy-MM-dd'))) {
      return NextResponse.json({ error: 'This date has been closed. Reopen it in Daily Closing to add expenses.' }, { status: 403 });
    }

    const expense = db
      .insert(expenses)
      .values({ description, amount: numAmount, category, date: expenseDate.toISOString(), paymentMethod: paymentMethod ?? 'Cash' })
      .returning()
      .get();

    const { id, ...rest } = expense;
    return NextResponse.json({ _id: id, ...rest }, { status: 201 });
  } catch (error) {
    console.error('POST expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
