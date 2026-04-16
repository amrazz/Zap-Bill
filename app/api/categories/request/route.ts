import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Category from '@/lib/models/Category';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    await connectDB();

    const category = await Category.findById(id);
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    // Allow requesting either your own category to share, or requesting someone else's category to be shared
    category.commonRequested = true;
    category.requestedBy = session.department;
    await category.save();

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Category request error:', error);
    return NextResponse.json({ error: 'Failed to request common category' }, { status: 500 });
  }
}
