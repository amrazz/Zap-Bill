import { NextRequest, NextResponse } from 'next/server';
import { eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { categories, dishes } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const all = db.select().from(categories).orderBy(categories.name).all();
    return NextResponse.json(all.map((c) => ({ _id: c.id, name: c.name, createdAt: c.createdAt })));
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

    const trimmed = name.trim();
    const existing = db.select().from(categories).all().find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      return NextResponse.json({ _id: existing.id, name: existing.name, createdAt: existing.createdAt });
    }

    const category = db.insert(categories).values({ name: trimmed }).returning().get();
    return NextResponse.json({ _id: category.id, name: category.name, createdAt: category.createdAt }, { status: 201 });
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

    const category = db.select().from(categories).where(eq(categories.id, id)).get();
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const oldName = category.name;
    const trimmedNewName = newName.trim();

    const conflict = db
      .select()
      .from(categories)
      .where(ne(categories.id, id))
      .all()
      .find((c) => c.name.toLowerCase() === trimmedNewName.toLowerCase());
    if (conflict) return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });

    const updated = db.update(categories).set({ name: trimmedNewName }).where(eq(categories.id, id)).returning().get();

    // Cascading update to dishes referencing the old category name
    db.update(dishes).set({ category: trimmedNewName }).where(eq(dishes.category, oldName)).run();

    return NextResponse.json({ _id: updated.id, name: updated.name, createdAt: updated.createdAt });
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

    const category = db.select().from(categories).where(eq(categories.id, id)).get();
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const itemCount = db.select().from(dishes).where(eq(dishes.category, category.name)).all().length;
    if (itemCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: This category contains ${itemCount} items. Move or delete the items first.`, itemCount },
        { status: 400 }
      );
    }

    db.delete(categories).where(eq(categories.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
