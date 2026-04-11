import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Salary from '@/lib/models/Salary';
import { getSession } from '@/lib/session';
import { format } from 'date-fns';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.department !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const salaries = await Salary.find().sort({ createdAt: -1 }).limit(200).lean();
    return NextResponse.json(salaries);
  } catch (error) {
    console.error('GET salaries error:', error);
    return NextResponse.json({ error: 'Failed to fetch salaries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.department !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { staffName, paidAmount, totalAmount, paidAt, notes } = await request.json();
    
    // Improved validation
    if (!staffName) return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
    if (paidAmount === undefined || paidAmount === null || paidAmount === "") {
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

    await connectDB();
    const salary = await Salary.create({
      staffName,
      month: format(payDate, 'MMMM'),
      year: payDate.getFullYear(),
      totalAmount: total,
      payments: [{ amount: paid, paidAt: payDate, notes }],
      status,
      // Legacy fields for backward compatibility display
      amount: paid,
      paidAt: payDate,
      notes,
    });

    return NextResponse.json(salary, { status: 201 });
  } catch (error) {
    console.error('POST salary error:', error);
    return NextResponse.json({ error: 'Failed to create salary record' }, { status: 500 });
  }
}
