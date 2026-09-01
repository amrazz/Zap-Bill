import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { salaries, salaryPayments } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { amount, paidAt, notes } = await request.json();
    if (amount === undefined || amount === null || !paidAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const salary = db.select().from(salaries).where(eq(salaries.id, id)).get();
    if (!salary) {
      return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
    }

    db.insert(salaryPayments).values({ salaryId: id, amount: Number(amount), paidAt: new Date(paidAt).toISOString(), notes }).run();

    const payments = db.select().from(salaryPayments).where(eq(salaryPayments.salaryId, id)).all();
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const status = !salary.totalAmount || totalPaid >= salary.totalAmount ? 'paid' : 'partial';

    const updated = db.update(salaries).set({ status }).where(eq(salaries.id, id)).returning().get();

    return NextResponse.json({
      _id: updated.id,
      staffName: updated.staffName,
      month: updated.month,
      year: updated.year,
      totalAmount: updated.totalAmount,
      status: updated.status,
      createdAt: updated.createdAt,
      payments: payments.map((p) => ({ amount: p.amount, paidAt: p.paidAt, notes: p.notes })),
    });
  } catch (error) {
    console.error('POST salary pay error:', error);
    return NextResponse.json({ error: 'Failed to add payment' }, { status: 500 });
  }
}
