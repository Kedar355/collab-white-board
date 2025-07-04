import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Room from '@/models/Room';
import User from '@/models/User';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization') || '');
    
    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    const room = await Room.findById(params.id);
    if (!room || !room.isActive) {
      return NextResponse.json(
        { message: 'Room not found' },
        { status: 404 }
      );
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if room is full
    if (room.members.length >= room.settings.maxMembers) {
      return NextResponse.json(
        { message: 'Room is full' },
        { status: 400 }
      );
    }

    // Check if user is already in room
    const existingMember = room.members.find(
      member => member.userId.toString() === user._id.toString()
    );

    if (existingMember) {
      // Update last active
      existingMember.lastActive = new Date();
    } else {
      // Add new member
      room.members.push({
        userId: user._id,
        username: user.username,
        role: 'guest',
        joinedAt: new Date(),
        lastActive: new Date()
      });

      // Add room to user's rooms if not already there
      if (!user.rooms.includes(room._id)) {
        user.rooms.push(room._id);
        await user.save();
      }
    }

    room.lastActivity = new Date();
    await room.save();

    const roomData = {
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      host: room.host.toString(),
      members: room.members.map(member => ({
        id: member.userId.toString(),
        username: member.username,
        role: member.role,
        joinedAt: member.joinedAt,
        lastActive: member.lastActive
      })),
      boardData: room.boardData,
      settings: room.settings,
      created: room.created,
      lastActivity: room.lastActivity,
      isActive: room.isActive
    };

    return NextResponse.json(roomData);

  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}