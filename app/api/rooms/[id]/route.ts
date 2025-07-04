import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Room from '@/models/Room';
import User from '@/models/User';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const room = await Room.findById(params.id)
      .populate('host', 'username avatar')
      .populate('members.userId', 'username avatar');

    if (!room || !room.isActive) {
      return NextResponse.json(
        { message: 'Room not found' },
        { status: 404 }
      );
    }

    const roomData = {
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      host: room.host._id.toString(),
      members: room.members.map(member => ({
        id: member.userId._id.toString(),
        username: member.username,
        role: member.role,
        avatar: member.userId.avatar,
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
    console.error('Fetch room error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    if (!room) {
      return NextResponse.json(
        { message: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if user is host or moderator
    const userMember = room.members.find(
      member => member.userId.toString() === payload.userId
    );

    if (!userMember || (userMember.role !== 'host' && userMember.role !== 'moderator')) {
      return NextResponse.json(
        { message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const updates = await request.json();
    
    // Update allowed fields
    if (updates.name) room.name = updates.name.trim();
    if (updates.description !== undefined) room.description = updates.description?.trim();
    if (updates.settings) {
      room.settings = { ...room.settings, ...updates.settings };
    }
    if (updates.boardData) {
      room.boardData = { ...room.boardData, ...updates.boardData };
      room.boardData.lastModified = new Date();
      room.boardData.version += 1;
    }

    room.lastActivity = new Date();
    await room.save();

    return NextResponse.json({ message: 'Room updated successfully' });

  } catch (error) {
    console.error('Update room error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}