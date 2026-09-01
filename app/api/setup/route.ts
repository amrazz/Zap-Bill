import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { db, hasAdminUser, getAppSettings } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { createSession } from '@/lib/session';

export async function GET() {
  const { department } = getAppSettings();
  return NextResponse.json({ needsSetup: !hasAdminUser(), department });
}

export async function POST(request: NextRequest) {
  try {
    if (hasAdminUser()) {
      return NextResponse.json({ error: 'Setup has already been completed.' }, { status: 400 });
    }

    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = db
      .insert(users)
      .values({ username: username.toLowerCase().trim(), password: hashedPassword, role: 'admin' })
      .returning()
      .get();

    await createSession(user.id, user.username, 'admin');
    return NextResponse.json({ success: true, username: user.username });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Failed to complete setup.' }, { status: 500 });
  }
}
