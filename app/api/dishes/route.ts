import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Dish from '@/lib/models/Dish';

export async function GET() {
  try {
    await connectDB();
    const dishes = await Dish.find({ isAvailable: true }).sort({ department: 1, name: 1 }).lean();
    return NextResponse.json(dishes);
  } catch (error) {
    console.error('GET dishes error:', error);
    return NextResponse.json({ error: 'Failed to fetch dishes.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, department, imageUrl, variants, isAvailable } = body;

    if (!name || !department || !variants || variants.length === 0) {
      return NextResponse.json(
        { error: 'Name, department, and at least one variant are required.' },
        { status: 400 }
      );
    }

    await connectDB();
    const dish = await Dish.create({ name, department, imageUrl, variants, isAvailable: isAvailable ?? true });
    return NextResponse.json(dish, { status: 201 });
  } catch (error) {
    console.error('POST dish error:', error);
    return NextResponse.json({ error: 'Failed to create dish.' }, { status: 500 });
  }
}
