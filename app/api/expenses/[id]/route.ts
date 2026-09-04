import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';
import { db, isDateClosed } from '@/lib/db/client';
import { expenses } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const expense = db.select().from(expenses).where(eq(expenses.id, id)).get();
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    if (isDateClosed(format(new Date(expense.date), 'yyyy-MM-dd'))) {
      return NextResponse.json({ error: "This expense's date has been closed. Reopen it in Daily Closing first." }, { status: 403 });
    }

    db.delete(expenses).where(eq(expenses.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE expense error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
