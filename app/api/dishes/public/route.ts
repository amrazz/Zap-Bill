import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { dishes, dishVariants } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const availableDishes = db.select().from(dishes).where(eq(dishes.isAvailable, true)).orderBy(dishes.name).all();
    const allVariants = availableDishes.length
      ? db.select().from(dishVariants).where(inArray(dishVariants.dishId, availableDishes.map((d) => d.id))).all()
      : [];

    const result = availableDishes.map((d) => ({
      _id: d.id,
      name: d.name,
      category: d.category,
      imageUrl: d.imageUrl,
      isAvailable: d.isAvailable,
      variants: allVariants.filter((v) => v.dishId === d.id).map((v) => ({ label: v.label, price: v.price })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Public GET dishes error:', error);
    return NextResponse.json({ error: 'Failed to fetch public menu.' }, { status: 500 });
  }
}
