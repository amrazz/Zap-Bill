import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Salary from '@/lib/models/Salary';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.department !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const salaries = await Salary.find().sort({ paidAt: -1 }).limit(100).lean();
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

    const { staffName, amount, month, year, paidAt, notes } = await request.json();
    if (!staffName || !amount || !month || !year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();
    const salary = await Salary.create({ staffName, amount, month, year, paidAt, notes });
    return NextResponse.json(salary, { status: 201 });
  } catch (error) {
    console.error('POST salary error:', error);
    return NextResponse.json({ error: 'Failed to create salary record' }, { status: 500 });
  }
}
