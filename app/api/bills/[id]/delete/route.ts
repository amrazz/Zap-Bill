import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bills } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reason } = await request.json();
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: 'A deletion reason is required.' }, { status: 400 });
    }

    const bill = db
      .update(bills)
      .set({ isDeleted: true, deletionReason: reason, deletedAt: new Date().toISOString() })
      .where(eq(bills.id, id))
      .returning()
      .get();

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
    }

    const { id: billId, ...rest } = bill;
    return NextResponse.json({ message: 'Bill successfully cancelled.', bill: { _id: billId, ...rest } });
  } catch (error) {
    console.error('Delete bill error:', error);
    return NextResponse.json({ error: 'Failed to delete bill.' }, { status: 500 });
  }
}
