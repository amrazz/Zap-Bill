import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Cloudinary uploader.upload accepts remote URLs directly!
    const result = await cloudinary.uploader.upload(url, {
      folder: 'zapbill',
    });

    return NextResponse.json({ secure_url: result.secure_url });
  } catch (error: unknown) {
    console.error('Cloudinary url upload error:', error);
    const message = error instanceof Error ? error.message : 'URL Image upload failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
