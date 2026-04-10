import { NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import Bill from '@/lib/models/Bill';

export async function GET() {
  try {
    await connectDB();

    const bakeryUser = process.env.SEED_BAKERY_USER;
    const bakeryPass = process.env.SEED_BAKERY_PASS;

    const restaurantUser = process.env.SEED_RESTAURANT_USER;
    const restaurantPass = process.env.SEED_RESTAURANT_PASS;

    const adminUser = process.env.SEED_ADMIN_USER;
    const adminPass = process.env.SEED_ADMIN_PASS;

    if (!bakeryUser || !bakeryPass || !restaurantUser || !restaurantPass || !adminUser || !adminPass) {
      return NextResponse.json({ error: 'Missing seed credentials in environment variables.' }, { status: 500 });
    }

    const usersToCreate = [
      { username: bakeryUser, password: bakeryPass, department: 'Bakery' },
      { username: restaurantUser, password: restaurantPass, department: 'Restaurant' },
      { username: adminUser, password: adminPass, department: 'Admin' },
    ];

    const results = [];

    for (const u of usersToCreate) {
      let user = await User.findOne({ username: u.username });
      const hashedPassword = await bcrypt.hash(u.password, 10);

      if (!user) {
        await User.create({
          username: u.username,
          password: hashedPassword,
          department: u.department,
        });
        results.push(`Created user for ${u.department} department`);
      } else {
        // Always update password and department to match current SEED config
        user.password = hashedPassword;
        user.department = u.department;
        await user.save();
        results.push(`Synchronized ${u.department} department credentials`);
      }
    }

    // Set default department for all other users
    await User.updateMany({ department: { $exists: false } }, { $set: { department: 'Restaurant' } });

    // Set default department for all existing bills
    await Bill.updateMany({ department: { $exists: false } }, { $set: { department: 'Restaurant' } });

    return NextResponse.json({
      success: true,
      message: 'Seeding complete (credentials not exposed for security)',
      details: results
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed users' }, { status: 500 });
  }
}
