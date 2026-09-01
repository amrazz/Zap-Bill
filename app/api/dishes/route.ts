import { NextRequest, NextResponse } from 'next/server';
import { inArray, like } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { dishes, dishVariants } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

function serializeDish(dish: typeof dishes.$inferSelect, variants: (typeof dishVariants.$inferSelect)[]) {
  return {
    _id: dish.id,
    name: dish.name,
    category: dish.category,
    imageUrl: dish.imageUrl,
    isAvailable: dish.isAvailable,
    variants: variants.map((v) => ({ label: v.label, price: v.price })),
    createdAt: dish.createdAt,
    updatedAt: dish.updatedAt,
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allDishes = db.select().from(dishes).orderBy(dishes.name).all();
    const allVariants = allDishes.length
      ? db.select().from(dishVariants).where(inArray(dishVariants.dishId, allDishes.map((d) => d.id))).all()
      : [];

    const result = allDishes.map((d) => serializeDish(d, allVariants.filter((v) => v.dishId === d.id)));
    return NextResponse.json(result);
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

    if (!name || !variants || variants.length === 0) {
      return NextResponse.json({ error: 'Name and at least one variant are required.' }, { status: 400 });
    }

    if (variants.some((v: { price: number }) => v.price <= 0)) {
      return NextResponse.json({ error: 'All item prices must be greater than 0.' }, { status: 400 });
    }

    const existingDish = db
      .select()
      .from(dishes)
      .where(like(dishes.name, name.trim()))
      .all()
      .find((d) => d.name.toLowerCase() === name.trim().toLowerCase());

    if (existingDish) {
      return NextResponse.json({ error: `Item "${name}" already exists.` }, { status: 400 });
    }

    const dish = db
      .insert(dishes)
      .values({
        name: name.trim(),
        category: category || 'common',
        imageUrl: imageUrl || null,
        isAvailable: isAvailable ?? true,
      })
      .returning()
      .get();

    const insertedVariants = variants.map((v: { label: string; price: number }) =>
      db.insert(dishVariants).values({ dishId: dish.id, label: v.label, price: v.price }).returning().get()
    );

    return NextResponse.json(serializeDish(dish, insertedVariants), { status: 201 });
  } catch (error) {
    console.error('POST dish error:', error);
    return NextResponse.json({ error: 'Failed to create dish.' }, { status: 500 });
  }
}
