import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { createSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    await connectDB();

    // Find user (case-insensitive via lowercase in schema)
    const user = await User.findOne({ username: username.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    await createSession(user._id.toString(), user.username, user.department);
    return NextResponse.json({ success: true, username: user.username, department: user.department });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
