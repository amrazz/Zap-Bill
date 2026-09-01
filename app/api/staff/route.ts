import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const all = db.select().from(users).all();
    return NextResponse.json(all.map((u) => ({ _id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })));
  } catch (error) {
    console.error('GET staff error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { username, password } = await request.json();
    if (!username || !password) return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });

    const normalized = username.toLowerCase().trim();
    const existing = db.select().from(users).where(eq(users.username, normalized)).get();
    if (existing) return NextResponse.json({ error: 'That username is already taken.' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = db.insert(users).values({ username: normalized, password: hashedPassword, role: 'staff' }).returning().get();

    return NextResponse.json({ _id: user.id, username: user.username, role: user.role, createdAt: user.createdAt }, { status: 201 });
  } catch (error) {
    console.error('POST staff error:', error);
    return NextResponse.json({ error: 'Failed to create staff account' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });

    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) return NextResponse.json({ error: 'Staff account not found' }, { status: 404 });
    if (target.role === 'admin') return NextResponse.json({ error: 'Cannot remove an admin account' }, { status: 400 });

    db.delete(users).where(eq(users.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE staff error:', error);
    return NextResponse.json({ error: 'Failed to remove staff account' }, { status: 500 });
  }
}
