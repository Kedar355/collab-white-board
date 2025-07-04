import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Room from '@/models/Room';
import User from '@/models/User';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const rooms = await Room.find({
      isActive: true,
      'settings.isPublic': true
    })
    .select('name members.length settings.maxMembers created host')
    .populate('host', 'username')
    .sort({ lastActivity: -1 })
    .limit(50);

    const roomList = rooms.map(room => ({
      id: room._id.toString(),
      name: room.name,
      memberCount: room.members.length,
      maxMembers: room.settings.maxMembers,
      created: room.created,
      host: room.host
    }));

    return NextResponse.json(roomList);

  } catch (error) {
    console.error('Fetch rooms error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { name, description, settings } = await request.json();

    if (!name || name.trim().length < 1) {
      return NextResponse.json(
        { message: 'Room name is required' },
        { status: 400 }
      );
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const room = new Room({
      name: name.trim(),
      description: description?.trim(),
      host: user._id,
      members: [{
        userId: user._id,
        username: user.username,
        role: 'host',
        joinedAt: new Date(),
        lastActive: new Date()
      }],
      settings: {
        allowGuests: true,
        maxMembers: 50,
        isPublic: true,
        recordSession: false,
        allowChat: true,
        allowVoiceNotes: true,
        allowMediaEmbed: true,
        ...settings
      },
      boardData: {
        paths: [],
        shapes: [],
        texts: [],
        media: [],
        stickers: [],
        version: 1,
        lastModified: new Date()
      }
    });

    await room.save();

    // Add room to user's rooms
    user.rooms.push(room._id);
    await user.save();

    const roomData = {
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      host: user._id.toString(),
      members: room.members.map(member => ({
        id: member.userId.toString(),
        username: member.username,
        role: member.role,
        joinedAt: member.joinedAt,
        lastActive: member.lastActive
      })),
      settings: room.settings,
      created: room.created,
      isActive: room.isActive
    };

    return NextResponse.json(roomData, { status: 201 });

  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}