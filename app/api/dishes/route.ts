import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Dish from '@/lib/models/Dish';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const dishes = await Dish.find({ 
      isAvailable: true,
      department: session.department 
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
    const { name, category, imageUrl, variants, isAvailable } = body;

    // Use department from session, ignore what's in the body for security
    const department = session.department;

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

    // Check if dish already exists in this department
    const existingDish = await Dish.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
      department 
    });
    
    if (existingDish) {
      return NextResponse.json(
        { error: `Item "${name}" already exists in ${department}.` },
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
