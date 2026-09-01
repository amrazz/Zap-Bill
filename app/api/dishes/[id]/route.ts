import { NextRequest, NextResponse } from 'next/server';
import { eq, ne, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { dishes, dishVariants } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const dish = db.select().from(dishes).where(eq(dishes.id, id)).get();
    if (!dish) return NextResponse.json({ error: 'Dish not found.' }, { status: 404 });
    const variants = db.select().from(dishVariants).where(eq(dishVariants.dishId, id)).all();
    return NextResponse.json(serializeDish(dish, variants));
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dish.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const body = await request.json();
    const { name, category, imageUrl, isAvailable, variants } = body;

    if (variants && variants.some((v: { price: number }) => v.price <= 0)) {
      return NextResponse.json({ error: 'All item prices must be greater than 0.' }, { status: 400 });
    }

    if (name) {
      const conflict = db
        .select()
        .from(dishes)
        .where(and(ne(dishes.id, id)))
        .all()
        .find((d) => d.name.toLowerCase() === name.trim().toLowerCase());
      if (conflict) {
        return NextResponse.json({ error: `Item "${name}" already exists.` }, { status: 400 });
      }
    }

    const updates: Partial<typeof dishes.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (category !== undefined) updates.category = category;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;

    const dish = db.update(dishes).set(updates).where(eq(dishes.id, id)).returning().get();
    if (!dish) return NextResponse.json({ error: 'Dish not found.' }, { status: 404 });

    if (variants) {
      db.delete(dishVariants).where(eq(dishVariants.dishId, id)).run();
      for (const v of variants as { label: string; price: number }[]) {
        db.insert(dishVariants).values({ dishId: id, label: v.label, price: v.price }).run();
      }
    }

    const finalVariants = db.select().from(dishVariants).where(eq(dishVariants.dishId, id)).all();
    return NextResponse.json(serializeDish(dish, finalVariants));
  } catch (error) {
    console.error('PUT dish error:', error);
    return NextResponse.json({ error: 'Failed to update dish.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const dish = db.delete(dishes).where(eq(dishes.id, id)).returning().get();
    if (!dish) return NextResponse.json({ error: 'Dish not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE dish error:', error);
    return NextResponse.json({ error: 'Failed to delete dish.' }, { status: 500 });
  }
}
