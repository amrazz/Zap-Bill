import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Dish from '@/lib/models/Dish';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const dishes = await Dish.find({ 
      isAvailable: true,
      department: { $in: ['Restaurant', 'Both'] }
    }).sort({ name: 1 }).lean();
    
    return NextResponse.json(dishes);
  } catch (error) {
    console.error('Public GET dishes error:', error);
    return NextResponse.json({ error: 'Failed to fetch public menu.' }, { status: 500 });
  }
}
