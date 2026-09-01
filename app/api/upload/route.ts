import { NextRequest, NextResponse } from 'next/server';
import { saveUploadBuffer } from '@/lib/uploads';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mime = file.type || 'image/jpeg';

    const secure_url = saveUploadBuffer(buffer, mime);
    return NextResponse.json({ secure_url });
  } catch (error: unknown) {
    console.error('Image upload error:', error);
    const message = error instanceof Error ? error.message : 'Image upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
