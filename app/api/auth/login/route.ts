import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { username, email } = await request.json();

    if (!username || username.trim().length < 2) {
      return NextResponse.json(
        { message: 'Username must be at least 2 characters long' },
        { status: 400 }
      );
    }

    // Check if user exists
    let user = await User.findOne({ username: username.trim() });

    if (!user) {
      // Create new user
      user = new User({
        username: username.trim(),
        email: email?.trim() || undefined,
        lastActive: new Date()
      });
      await user.save();
    } else {
      // Update last active
      user.lastActive = new Date();
      if (email && !user.email) {
        user.email = email.trim();
      }
      await user.save();
    }

    const token = generateToken(user);

    const userData = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      rooms: user.rooms.map(id => id.toString()),
      created: user.created,
      preferences: user.preferences
    };

    return NextResponse.json({
      user: userData,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}