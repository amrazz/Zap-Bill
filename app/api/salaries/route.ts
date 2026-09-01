import { NextRequest, NextResponse } from 'next/server';
import { desc, inArray } from 'drizzle-orm';
import { format } from 'date-fns';
import { db } from '@/lib/db/client';
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
    payments: payments.map((p) => ({ amount: p.amount, paidAt: p.paidAt, notes: p.notes })),
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

    const { staffName, paidAmount, totalAmount, paidAt, notes } = await request.json();

    if (!staffName) return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
    if (paidAmount === undefined || paidAmount === null || paidAmount === '') {
      return NextResponse.json({ error: 'Paid amount is required' }, { status: 400 });
    }
    if (!paidAt) return NextResponse.json({ error: 'Payment date is required' }, { status: 400 });

    const payDate = new Date(paidAt);
    if (isNaN(payDate.getTime())) {
      return NextResponse.json({ error: 'Invalid payment date' }, { status: 400 });
    }

    const paid = Number(paidAmount);
    if (isNaN(paid)) {
      return NextResponse.json({ error: 'Paid amount must be a number' }, { status: 400 });
    }

    const total = totalAmount ? Number(totalAmount) : undefined;
    const status = total && paid < total ? 'partial' : 'paid';

    const salary = db
      .insert(salaries)
      .values({ staffName, month: format(payDate, 'MMMM'), year: payDate.getFullYear(), totalAmount: total, status })
      .returning()
      .get();

    const payment = db
      .insert(salaryPayments)
      .values({ salaryId: salary.id, amount: paid, paidAt: payDate.toISOString(), notes })
      .returning()
      .get();

    return NextResponse.json(serializeSalary(salary, [payment]), { status: 201 });
  } catch (error) {
    console.error('POST salary error:', error);
    return NextResponse.json({ error: 'Failed to create salary record' }, { status: 500 });
  }
}
