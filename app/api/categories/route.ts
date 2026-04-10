import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Category from '@/lib/models/Category';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const categories = await Category.find({ department: session.department }).sort({ name: 1 }).lean();
    return NextResponse.json(categories);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch categories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

    await connectDB();
    
    // Check if it already exists for this department
    const existing = await Category.findOne({ 
      name: name.trim(), 
      department: session.department 
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const category = await Category.create({ 
      name: name.trim(), 
      department: session.department 
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

    await connectDB();
    
    // Ensure we only delete from the current department
    const result = await Category.deleteOne({ 
      name: name.trim(), 
      department: session.department 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
