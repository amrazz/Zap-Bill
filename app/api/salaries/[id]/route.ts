import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';
import { db, isDateClosed } from '@/lib/db/client';
import { salaries, salaryPayments } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const salary = db.select().from(salaries).where(eq(salaries.id, id)).get();
    if (!salary) {
      return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
    }

    // Deleting the whole record would also wipe any payment dated on an
    // already-closed day — block that instead of silently altering closed numbers.
    const payments = db.select().from(salaryPayments).where(eq(salaryPayments.salaryId, id)).all();
    const blockingPayment = payments.find((p) => isDateClosed(format(new Date(p.paidAt), 'yyyy-MM-dd')));
    if (blockingPayment) {
      const blockingDate = format(new Date(blockingPayment.paidAt), 'dd/MM/yyyy');
      return NextResponse.json(
        { error: `This staff member has a payment on ${blockingDate}, which is closed. Reopen that day in Daily Closing first.` },
        { status: 403 }
      );
    }

    // salary_payments cascades via the FK's ON DELETE CASCADE.
    db.delete(salaries).where(eq(salaries.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE salary error:', error);
    return NextResponse.json({ error: 'Failed to delete salary record' }, { status: 500 });
  }
}
