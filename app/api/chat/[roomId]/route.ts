import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import ChatMessage from '@/models/ChatMessage';
import Room from '@/models/Room';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
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

    // Verify user is member of room
    const room = await Room.findById(params.roomId);
    if (!room) {
      return NextResponse.json(
        { message: 'Room not found' },
        { status: 404 }
      );
    }

    const isMember = room.members.some(
      member => member.userId.toString() === payload.userId
    );

    if (!isMember) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const messages = await ChatMessage.find({ roomId: params.roomId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .populate('replyTo', 'message username timestamp');

    const formattedMessages = messages.reverse().map(msg => ({
      id: msg._id.toString(),
      username: msg.username,
      message: msg.message,
      type: msg.type,
      attachments: msg.attachments,
      replyTo: msg.replyTo ? {
        id: msg.replyTo._id.toString(),
        message: msg.replyTo.message,
        username: msg.replyTo.username,
        timestamp: msg.replyTo.timestamp
      } : null,
      isEdited: msg.isEdited,
      editedAt: msg.editedAt,
      timestamp: msg.timestamp
    }));

    return NextResponse.json(formattedMessages);

  } catch (error) {
    console.error('Fetch chat messages error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
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

    const { message, attachments, replyTo } = await request.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { message: 'Message content is required' },
        { status: 400 }
      );
    }

    // Verify user is member of room
    const room = await Room.findById(params.roomId);
    if (!room) {
      return NextResponse.json(
        { message: 'Room not found' },
        { status: 404 }
      );
    }

    const member = room.members.find(
      member => member.userId.toString() === payload.userId
    );

    if (!member) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      );
    }

    const chatMessage = new ChatMessage({
      roomId: params.roomId,
      userId: payload.userId,
      username: member.username,
      message: message.trim(),
      attachments: attachments || [],
      replyTo: replyTo || null
    });

    await chatMessage.save();

    const responseMessage = {
      id: chatMessage._id.toString(),
      username: chatMessage.username,
      message: chatMessage.message,
      type: chatMessage.type,
      attachments: chatMessage.attachments,
      replyTo: chatMessage.replyTo,
      isEdited: chatMessage.isEdited,
      editedAt: chatMessage.editedAt,
      timestamp: chatMessage.timestamp
    };

    return NextResponse.json(responseMessage, { status: 201 });

  } catch (error) {
    console.error('Send chat message error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}