import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings, setPrinterWidthMm } from '@/lib/db/client';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { printerWidthMm } = getAppSettings();
  return NextResponse.json({ printerWidthMm });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { printerWidthMm } = await request.json();
  const mm = Number(printerWidthMm);
  if (!Number.isFinite(mm) || mm < 40 || mm > 300) {
    return NextResponse.json({ error: 'Printer width must be between 40 and 300 mm.' }, { status: 400 });
  }

  setPrinterWidthMm(Math.round(mm));
  return NextResponse.json({ printerWidthMm: Math.round(mm) });
}
