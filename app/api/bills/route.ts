import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Bill from '@/lib/models/Bill';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const query = session.department === 'Admin' ? {} : { department: session.department };
    const bills = await Bill.find(query).sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json(bills);
  } catch (error) {
    console.error('GET bills error:', error);
    return NextResponse.json({ error: 'Failed to fetch bills.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { items, subtotal, orderType } = body;
    const department = session.department;

    if (!items || items.length === 0 || subtotal === undefined || !orderType) {
      return NextResponse.json({ error: 'Items, subtotal, and order type are required.' }, { status: 400 });
    }

    await connectDB();
    const bill = await Bill.create({ items, subtotal, orderType, department });
    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error('POST bill error:', error);
    return NextResponse.json({ error: 'Failed to save bill.' }, { status: 500 });
  }
}
