import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Expense from '@/lib/models/Expense';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.department !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const expenses = await Expense.find().sort({ date: -1 }).limit(100).lean();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('GET expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.department !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { description, amount, category, date, department } = await request.json();
    if (!description || !amount || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();
    const expense = await Expense.create({ description, amount, category, date, department });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('POST expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
