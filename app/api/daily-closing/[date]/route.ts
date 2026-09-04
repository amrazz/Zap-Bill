import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { dailyClosings } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

// "Reopen Day" — removes the closing record so that date's bills, expenses,
// and salary payments can be edited/deleted again.
export async function DELETE(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date } = await params;
    const existing = db.select().from(dailyClosings).where(eq(dailyClosings.date, date)).get();
    if (!existing) {
      return NextResponse.json({ error: 'This date is not closed.' }, { status: 404 });
    }

    db.delete(dailyClosings).where(eq(dailyClosings.date, date)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE daily-closing error:', error);
    return NextResponse.json({ error: 'Failed to reopen the day.' }, { status: 500 });
  }
}
