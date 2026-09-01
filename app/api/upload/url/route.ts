import { NextRequest, NextResponse } from 'next/server';
import { saveUploadBuffer } from '@/lib/uploads';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch image (${res.status})` }, { status: 400 });
    }

    const mime = res.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());

    const secure_url = saveUploadBuffer(buffer, mime);
    return NextResponse.json({ secure_url });
  } catch (error: unknown) {
    console.error('URL image upload error:', error);
    const message = error instanceof Error ? error.message : 'URL image upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
