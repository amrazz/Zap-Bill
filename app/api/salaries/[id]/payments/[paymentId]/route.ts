import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';
import { db, isDateClosed } from '@/lib/db/client';
import { salaries, salaryPayments } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, paymentId } = await params;
    const salary = db.select().from(salaries).where(eq(salaries.id, id)).get();
    if (!salary) {
      return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
    }

    const payment = db.select().from(salaryPayments).where(eq(salaryPayments.id, paymentId)).get();
    if (!payment || payment.salaryId !== id) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    if (isDateClosed(format(new Date(payment.paidAt), 'yyyy-MM-dd'))) {
      return NextResponse.json({ error: "This payment's date has been closed. Reopen it in Daily Closing first." }, { status: 403 });
    }

    db.delete(salaryPayments).where(eq(salaryPayments.id, paymentId)).run();

    const remaining = db.select().from(salaryPayments).where(eq(salaryPayments.salaryId, id)).all();
    const totalPaid = remaining.reduce((sum, p) => sum + p.amount, 0);
    const status = salary.totalAmount != null && totalPaid < salary.totalAmount ? 'partial' : 'paid';
    const updated = db.update(salaries).set({ status }).where(eq(salaries.id, id)).returning().get();

    return NextResponse.json({
      _id: updated.id,
      staffName: updated.staffName,
      totalAmount: updated.totalAmount,
      status: updated.status,
      createdAt: updated.createdAt,
      payments: remaining.map((p) => ({ _id: p.id, amount: p.amount, paymentMethod: p.paymentMethod, paidAt: p.paidAt, notes: p.notes })),
    });
  } catch (error) {
    console.error('DELETE salary payment error:', error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
