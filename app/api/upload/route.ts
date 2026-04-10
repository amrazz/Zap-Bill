import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convert file to base64 string because cloudinary.uploader.upload requires string path or url or base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mime = file.type || 'image/jpeg';
    const base64Data = `data:${mime};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'zapbill', // keeping images organized
    });

    return NextResponse.json({ secure_url: result.secure_url });
  } catch (error: unknown) {
    console.error('Cloudinary upload error:', error);
    const message = error instanceof Error ? error.message : 'Image upload failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
