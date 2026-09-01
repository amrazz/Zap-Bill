import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAppSettings } from '@/lib/db/client';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { department } = getAppSettings();
    return NextResponse.json({
      userId: session.userId,
      username: session.username,
      role: session.role,
      department,
    });
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
