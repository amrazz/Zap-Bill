import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';

export async function GET() {
  try {
    await connectDB();
    const users = await User.find({}, { password: 0 }).lean();
    return NextResponse.json({
      count: users.length,
      users: users
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
