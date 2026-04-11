import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Bill from '@/lib/models/Bill';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const status = searchParams.get('status') || 'all';

    await connectDB();
    
    let query: any = session.department === 'Admin' ? {} : { department: session.department, isDeleted: { $ne: true } };

    // Apply Admin-only status filter
    if (session.department === 'Admin') {
      if (status === 'active') query.isDeleted = { $ne: true };
      else if (status === 'deleted') query.isDeleted = true;
    }

    // Search by Bill Number (last 6 of ID) or Item Name
    if (search) {
      const searchStr = search.replace(/^ZB/i, '');
      query.$or = [
        { 'items.dishName': { $regex: search, $options: 'i' } }
      ];
      // If it looks like a bill ID snippet (hex characters)
      if (/^[0-9a-fA-F]+$/.test(searchStr)) {
        query.$or.push({ _id: { $regex: searchStr + '$', $options: 'i' } });
      }
    }

    // Date range
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const total = await Bill.countDocuments(query);
    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      bills,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      limit
    });
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
