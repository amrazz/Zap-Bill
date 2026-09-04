import { NextRequest, NextResponse } from 'next/server';
import { desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { dailyClosings } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');

    const total = db.select({ count: sql<number>`count(*)` }).from(dailyClosings).get()?.count ?? 0;
    const rows = db
      .select()
      .from(dailyClosings)
      .orderBy(desc(dailyClosings.date))
      .limit(limit)
      .offset((page - 1) * limit)
      .all();

    return NextResponse.json({
      closings: rows.map(({ id, ...rest }) => ({ _id: id, ...rest })),
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    });
  } catch (error) {
    console.error('GET daily-closing history error:', error);
    return NextResponse.json({ error: 'Failed to load closing history.' }, { status: 500 });
  }
}
