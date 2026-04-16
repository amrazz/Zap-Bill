import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Dish from '@/lib/models/Dish';
import { getSession } from '@/lib/session';
import Category from '@/lib/models/Category';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    // 1. Find all categories visible to this department (including 'Both' and requested ones)
    const otherDept = session.department === 'Restaurant' ? 'Bakery' : 'Restaurant';
    const categories = await Category.find({
      $or: [
        { department: session.department },
        { department: 'Both' },
        { department: otherDept, commonRequested: true }
      ]
    }).select('name').lean();
    
    const visibleCategoryNames = categories.map(c => c.name);

    // 2. Fetch dishes that are either in this department, marked as 'Both',
    // OR belong to one of the visible categories (even if the dish department is still fixed)
    const dishes = await Dish.find({
      $or: [
        { department: { $in: [session.department, 'Both'] } },
        { category: { $in: visibleCategoryNames } }
      ]
    }).sort({ name: 1 }).lean();

    return NextResponse.json(dishes);
  } catch (error) {
    console.error('GET dishes error:', error);
    return NextResponse.json({ error: 'Failed to fetch dishes.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, category, imageUrl, variants, isAvailable, department: bodyDept } = body;

    // Use department from body if it's 'Both', otherwise use session department
    const department = bodyDept === 'Both' ? 'Both' : session.department;

    if (!name || !variants || variants.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one variant are required.' },
        { status: 400 }
      );
    }

    // Amount/Price validation: No variant should have a price <= 0
    if (variants.some((v: any) => v.price <= 0)) {
      return NextResponse.json(
        { error: 'All item prices must be greater than 0.' },
        { status: 400 }
      );
    }

    await connectDB();

    // Conflict check logic:
    // 1. If 'Both', check conflict with ANY item of same name.
    // 2. If 'Restaurant'/'Bakery', check conflict with same department OR 'Both'.
    const conflictQuery: any = {
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    };

    if (department !== 'Both') {
      conflictQuery.department = { $in: [department, 'Both'] };
    }

    const existingDish = await Dish.findOne(conflictQuery);
    
    if (existingDish) {
      const locationLabel = existingDish.department === 'Both' ? 'all menus' : existingDish.department;
      return NextResponse.json(
        { error: `Item "${name}" already exists in ${locationLabel}.` },
        { status: 400 }
      );
    }

    const dish = await Dish.create({
      name: name.trim(),
      department,
      category,
      imageUrl,
      variants,
      isAvailable: isAvailable ?? true
    });
    return NextResponse.json(dish, { status: 201 });
  } catch (error) {
    console.error('POST dish error:', error);
    return NextResponse.json({ error: 'Failed to create dish.' }, { status: 500 });
  }
}
