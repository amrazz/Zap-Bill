import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Bill from '@/lib/models/Bill';
import { getSession } from '@/lib/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reason } = await request.json();
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: 'A deletion reason is required.' }, { status: 400 });
    }

    await connectDB();
    const bill = await Bill.findById(id);

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
    }

    // Admins can delete anything, others can only delete their own department's bills
    if (session.department !== 'Admin' && session.department !== bill.department) {
      return NextResponse.json({ error: 'You do not have permission to delete this bill.' }, { status: 403 });
    }

    bill.isDeleted = true;
    bill.deletionReason = reason;
    bill.deletedAt = new Date();
    await bill.save();

    return NextResponse.json({ message: 'Bill successfully cancelled.', bill });
  } catch (error) {
    console.error('Delete bill error:', error);
    return NextResponse.json({ error: 'Failed to delete bill.' }, { status: 500 });
  }
}
