import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings, hasAdminUser } from '@/lib/db/client';
import { migrateFromMongo } from '@/lib/migrate/fromMongo';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // Allowed during the first-run Setup Wizard (no admin exists yet — the
    // wizard already created a session by this point) or by a logged-in
    // admin re-running the import later from Settings.
    const session = await getSession();
    if (hasAdminUser() && (!session || session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uri } = await request.json();
    if (!uri) {
      return NextResponse.json({ error: 'A MongoDB connection string is required.' }, { status: 400 });
    }

    const { department } = getAppSettings();
    const result = await migrateFromMongo(uri, department);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Setup import error:', error);
    const message = error instanceof Error ? error.message : 'Failed to import data.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
