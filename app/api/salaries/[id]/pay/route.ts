import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Salary from '@/lib/models/Salary';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.department !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { amount, paidAt, notes } = await request.json();
    if (amount === undefined || amount === null || !paidAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();
    const salary = await Salary.findById(id);
    if (!salary) {
      return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
    }

    // Push the new installment
    salary.payments.push({ amount: Number(amount), paidAt: new Date(paidAt), notes });

    // Recalculate status: if totalAmount is set, check if fully covered
    const totalPaid = salary.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    if (!salary.totalAmount || totalPaid >= salary.totalAmount) {
      salary.status = 'paid';
    }

    // Keep legacy amount field updated to total paid so far
    salary.amount = totalPaid;

    await salary.save();
    return NextResponse.json(salary);
  } catch (error) {
    console.error('POST salary pay error:', error);
    return NextResponse.json({ error: 'Failed to add payment' }, { status: 500 });
  }
}
