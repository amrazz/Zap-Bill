import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Dish from '@/lib/models/Dish';
import mongoose from 'mongoose';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    await connectDB();
    const dish = await Dish.findById(id).lean();
    if (!dish) return NextResponse.json({ error: 'Dish not found.' }, { status: 404 });
    return NextResponse.json(dish);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dish.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }
    const body = await request.json();
    const { name, variants, department } = body;

    // Price validation
    if (variants && variants.some((v: any) => v.price <= 0)) {
      return NextResponse.json({ error: 'All item prices must be greater than 0.' }, { status: 400 });
    }

    await connectDB();

    // Check for name conflict if name is being changed
    if (name && department) {
      const existingConflict = await Dish.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        department
      });
      if (existingConflict) {
        return NextResponse.json({ error: `Item "${name}" already exists in ${department}.` }, { status: 400 });
      }
    }

    const dish = await Dish.findByIdAndUpdate(id, body, { new: true, runValidators: true }).lean();
    if (!dish) return NextResponse.json({ error: 'Dish not found.' }, { status: 404 });
    return NextResponse.json(dish);
  } catch (error) {
    console.error('PUT dish error:', error);
    return NextResponse.json({ error: 'Failed to update dish.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }
    await connectDB();
    const dish = await Dish.findByIdAndDelete(id);
    if (!dish) return NextResponse.json({ error: 'Dish not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE dish error:', error);
    return NextResponse.json({ error: 'Failed to delete dish.' }, { status: 500 });
  }
}
