import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Category from '@/lib/models/Category';
import Dish from '@/lib/models/Dish';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, action } = await request.json(); // action: 'accept' | 'reject'
    if (!id || !action) return NextResponse.json({ error: 'ID and action are required' }, { status: 400 });

    await connectDB();

    const category = await Category.findById(id);
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    // Validate that the current department is not the one who initiated the request
    const approverDept = session.department;
    const requesterDept = approverDept === 'Restaurant' ? 'Bakery' : 'Restaurant';

    // Validate that the current department is not the one who initiated the request
    if (category.requestedBy === approverDept) {
      return NextResponse.json({ error: 'You cannot approve a request you initiated' }, { status: 403 });
    }

    // If it was a legacy request (requestedBy is null), then owner cannot approve
    if (!category.requestedBy && category.department === approverDept) {
      return NextResponse.json({ error: 'You cannot approve your own offering' }, { status: 403 });
    }

    if (action === 'accept') {
      // 1. MERGE CATEGORIES: Check if approver already has a category with this name
      await Category.deleteOne({
        name: { $regex: new RegExp(`^${category.name.trim()}$`, 'i') },
        department: approverDept,
        _id: { $ne: id }
      });

      // 2. DEDUPLICATE DISHES: Find dishes in this category name across both departments
      const allDishes = await Dish.find({
        category: category.name,
        department: { $in: [requesterDept, approverDept] }
      });

      // Group by name
      const nameGroups: Record<string, any[]> = {};
      allDishes.forEach(d => {
        const key = d.name.toLowerCase().trim();
        if (!nameGroups[key]) nameGroups[key] = [];
        nameGroups[key].push(d);
      });

      for (const name in nameGroups) {
        const group = nameGroups[name];
        if (group.length > 1) {
          // Compare variants to find identical items
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              const dishA = group[i];
              const dishB = group[j];
              
              if (!dishA || !dishB) continue;

              const variantsA = dishA.variants.map((v: any) => `${v.label}:${v.price}`).sort().join('|');
              const variantsB = dishB.variants.map((v: any) => `${v.label}:${v.price}`).sort().join('|');

              if (variantsA === variantsB) {
                // Identity match! Merge them.
                // Keep dishA, delete dishB
                dishA.department = 'Both';
                await dishA.save();
                await Dish.findByIdAndDelete(dishB._id);
                
                // Remove dishB from group so we don't try to merge it again
                group[j] = null;
              }
            }
          }
        } else if (group.length === 1) {
           // Optional: Should single-department items in a common category also become 'Both'?
           // The user didn't explicitly ask for this, but it makes sense.
           // However, keeping them department-specific is safer if they want exclusivity.
           // I'll stick to 'Both' if they are merged, otherwise leave them.
        }
      }

      category.department = 'Both';
      category.isCommon = true;
      category.commonRequested = false;
      category.requestedBy = null;
    } else {
      category.commonRequested = false;
      category.requestedBy = null;
    }

    await category.save();

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Category resolve error:', error);
    return NextResponse.json({ error: 'Failed to resolve common category' }, { status: 500 });
  }
}
