import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { salaries } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const salary = db.select().from(salaries).where(eq(salaries.id, id)).get();
    if (!salary) {
      return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
    }

    // salary_payments cascades via the FK's ON DELETE CASCADE.
    db.delete(salaries).where(eq(salaries.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE salary error:', error);
    return NextResponse.json({ error: 'Failed to delete salary record' }, { status: 500 });
  }
}
