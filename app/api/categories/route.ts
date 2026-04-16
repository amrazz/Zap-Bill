import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Category from '@/lib/models/Category';
import Dish from '@/lib/models/Dish';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const otherDept = session.department === 'Restaurant' ? 'Bakery' : 'Restaurant';
    
    // Return all categories in the system so it can be managed/requested in tabs
    const categories = await Category.find({}).sort({ name: 1 }).lean();
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

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name: newName } = await request.json();
    if (!id || !newName) return NextResponse.json({ error: 'ID and new name are required' }, { status: 400 });

    await connectDB();

    const category = await Category.findById(id);
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const oldName = category.name;
    const trimmedNewName = newName.trim();

    // Check conflict
    const conflict = await Category.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${trimmedNewName}$`, 'i') },
      department: category.department
    });
    if (conflict) return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });

    // Update Category
    category.name = trimmedNewName;
    await category.save();

    // Cascading update to Dishes
    // When a category is shared (Both), we must update dishes in ALL departments
    const dishFilter = category.department === 'Both' 
      ? { category: oldName } 
      : { category: oldName, department: { $in: [category.department, 'Both'] } };

    await Dish.updateMany(dishFilter, { category: trimmedNewName });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Category PUT error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    await connectDB();

    const category = await Category.findById(id);
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    // Safeguard: Check if dishes exist in this category
    const itemCount = await Dish.countDocuments({ 
      category: category.name, 
      department: { $in: [category.department, 'Both'] } 
    });

    if (itemCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete: This category contains ${itemCount} items. Move or delete the items first.`,
        itemCount 
      }, { status: 400 });
    }

    await Category.deleteOne({ _id: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
