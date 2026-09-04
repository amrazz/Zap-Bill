import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, inArray } from 'drizzle-orm';
import { format } from 'date-fns';
import { db, isDateClosed } from '@/lib/db/client';
import { salaries, salaryPayments } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

function serializeSalary(salary: typeof salaries.$inferSelect, payments: (typeof salaryPayments.$inferSelect)[]) {
  return {
    _id: salary.id,
    staffName: salary.staffName,
    month: salary.month,
    year: salary.year,
    totalAmount: salary.totalAmount,
    status: salary.status,
    createdAt: salary.createdAt,
    payments: payments.map((p) => ({ _id: p.id, amount: p.amount, paymentMethod: p.paymentMethod, paidAt: p.paidAt, notes: p.notes })),
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allSalaries = db.select().from(salaries).orderBy(desc(salaries.createdAt)).limit(200).all();
    const allPayments = allSalaries.length
      ? db.select().from(salaryPayments).where(inArray(salaryPayments.salaryId, allSalaries.map((s) => s.id))).all()
      : [];

    const result = allSalaries.map((s) => serializeSalary(s, allPayments.filter((p) => p.salaryId === s.id)));
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET salaries error:', error);
    return NextResponse.json({ error: 'Failed to fetch salaries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { staffName, paidAmount, totalAmount, paidAt, notes, paymentMethod } = await request.json();

    if (!staffName || !staffName.trim()) return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
    if (paidAmount === undefined || paidAmount === null || paidAmount === '') {
      return NextResponse.json({ error: 'Paid amount is required' }, { status: 400 });
    }
    if (!paidAt) return NextResponse.json({ error: 'Payment date is required' }, { status: 400 });
    if (paymentMethod !== undefined && paymentMethod !== 'Cash' && paymentMethod !== 'Online') {
      return NextResponse.json({ error: 'Payment method must be Cash or Online' }, { status: 400 });
    }

    const payDate = new Date(paidAt);
    if (isNaN(payDate.getTime())) {
      return NextResponse.json({ error: 'Invalid payment date' }, { status: 400 });
    }

    const paid = Number(paidAmount);
    if (isNaN(paid)) {
      return NextResponse.json({ error: 'Paid amount must be a number' }, { status: 400 });
    }

    if (isDateClosed(format(payDate, 'yyyy-MM-dd'))) {
      return NextResponse.json({ error: 'This date has been closed. Reopen it in Daily Closing to add payments.' }, { status: 403 });
    }

    const total = totalAmount ? Number(totalAmount) : undefined;
    const trimmedName = staffName.trim();

    // A staff member is paid repeatedly (often daily) — find their existing
    // record instead of creating a new one every time, so they show up as a
    // single person with one running history rather than duplicate cards.
    const existing = db
      .select()
      .from(salaries)
      .all()
      .find((s) => s.staffName.trim().toLowerCase() === trimmedName.toLowerCase());

    const salary = existing
      ? total !== undefined
        ? db.update(salaries).set({ totalAmount: total }).where(eq(salaries.id, existing.id)).returning().get()
        : existing
      : db
          .insert(salaries)
          .values({ staffName: trimmedName, month: format(payDate, 'MMMM'), year: payDate.getFullYear(), totalAmount: total, status: 'paid' })
          .returning()
          .get();

    db.insert(salaryPayments).values({ salaryId: salary.id, amount: paid, paymentMethod: paymentMethod ?? 'Cash', paidAt: payDate.toISOString(), notes }).run();

    const allPayments = db.select().from(salaryPayments).where(eq(salaryPayments.salaryId, salary.id)).all();
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const status = salary.totalAmount != null && totalPaid < salary.totalAmount ? 'partial' : 'paid';
    const updated = db.update(salaries).set({ status }).where(eq(salaries.id, salary.id)).returning().get();

    return NextResponse.json(serializeSalary(updated, allPayments), { status: 201 });
  } catch (error) {
    console.error('POST salary error:', error);
    return NextResponse.json({ error: 'Failed to create salary record' }, { status: 500 });
  }
}
