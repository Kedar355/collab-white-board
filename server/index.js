const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://your-domain.com"] 
      : ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://your-domain.com"] 
    : ["http://localhost:3000"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collaborative-whiteboard';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  // Fall back to in-memory storage for development
  console.log('📝 Falling back to in-memory storage');
});

// Mongoose Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  avatar: String,
  rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }],
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    notifications: { type: Boolean, default: true },
    autoSave: { type: Boolean, default: true }
  },
  lastActive: { type: Date, default: Date.now },
  created: { type: Date, default: Date.now }
}, { timestamps: true });

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    role: { type: String, enum: ['host', 'moderator', 'guest'], default: 'guest' },
    joinedAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
  }],
  boardData: {
    paths: [mongoose.Schema.Types.Mixed],
    shapes: [mongoose.Schema.Types.Mixed],
    texts: [mongoose.Schema.Types.Mixed],
    media: [mongoose.Schema.Types.Mixed],
    stickers: [mongoose.Schema.Types.Mixed],
    version: { type: Number, default: 1 },
    lastModified: { type: Date, default: Date.now }
  },
  settings: {
    allowGuests: { type: Boolean, default: true },
    maxMembers: { type: Number, default: 50 },
    isPublic: { type: Boolean, default: true },
    recordSession: { type: Boolean, default: false },
    allowChat: { type: Boolean, default: true },
    allowVoiceNotes: { type: Boolean, default: true },
    allowMediaEmbed: { type: Boolean, default: true }
  },
  isActive: { type: Boolean, default: true },
  lastActivity: { type: Date, default: Date.now }
}, { timestamps: true });

const ChatMessageSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['user', 'system', 'ai'], default: 'user' },
  attachments: [String],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);

// In-memory storage for real-time data
const activeConnections = new Map(); // socketId -> user data
const roomConnections = new Map(); // roomId -> Set of socketIds
const cursorPositions = new Map(); // roomId -> Map(userId -> cursor data)

// Utility functions
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next(new Error('Invalid token'));
  }

  socket.userId = payload.userId;
  socket.username = payload.username;
  next();
};

// Socket.IO middleware
io.use(authenticateSocket);

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log(`✅ User connected: ${socket.username} (${socket.id})`);

  try {
    // Update user's last active time
    await User.findByIdAndUpdate(socket.userId, { lastActive: new Date() });
    
    // Store active connection
    activeConnections.set(socket.id, {
      userId: socket.userId,
      username: socket.username,
      joinedAt: new Date()
    });

    // Handle room creation
    socket.on('create-room', async (data) => {
      try {
        const user = await User.findById(socket.userId);
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        const room = new Room({
          name: data.roomName,
          description: data.description,
          host: user._id,
          members: [{
            userId: user._id,
            username: user.username,
            role: 'host',
            joinedAt: new Date(),
            lastActive: new Date()
          }],
          settings: data.settings || {},
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

        // Join socket room
        socket.join(room._id.toString());
        
        // Initialize room connections
        if (!roomConnections.has(room._id.toString())) {
          roomConnections.set(room._id.toString(), new Set());
        }
        roomConnections.get(room._id.toString()).add(socket.id);

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
          boardData: room.boardData,
          settings: room.settings,
          created: room.createdAt,
          isActive: room.isActive
        };

        socket.emit('room-created', roomData);
        socket.emit('joined-room', roomData);

        // Send welcome message
        const welcomeMessage = new ChatMessage({
          roomId: room._id,
          userId: user._id,
          username: 'System',
          message: `Welcome to ${room.name}! You are the host.`,
          type: 'system'
        });
        await welcomeMessage.save();
        socket.emit('chat-message', welcomeMessage);

      } catch (error) {
        console.error('Create room error:', error);
        socket.emit('error', { message: 'Failed to create room' });
      }
    });

    // Handle room joining
    socket.on('join-room', async (data) => {
      try {
        const room = await Room.findById(data.roomId).populate('host', 'username');
        if (!room || !room.isActive) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const user = await User.findById(socket.userId);
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Check if room is full
        if (room.members.length >= room.settings.maxMembers) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }

        // Check if user is already in room
        const existingMember = room.members.find(
          member => member.userId.toString() === user._id.toString()
        );

        if (!existingMember) {
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
        } else {
          // Update last active
          existingMember.lastActive = new Date();
        }

        room.lastActivity = new Date();
        await room.save();

        // Join socket room
        socket.join(room._id.toString());
        
        // Update room connections
        if (!roomConnections.has(room._id.toString())) {
          roomConnections.set(room._id.toString(), new Set());
        }
        roomConnections.get(room._id.toString()).add(socket.id);

        const roomData = {
          id: room._id.toString(),
          name: room.name,
          description: room.description,
          host: room.host._id.toString(),
          members: room.members.map(member => ({
            id: member.userId.toString(),
            username: member.username,
            role: member.role,
            joinedAt: member.joinedAt,
            lastActive: member.lastActive
          })),
          boardData: room.boardData,
          settings: room.settings,
          created: room.createdAt,
          lastActivity: room.lastActivity,
          isActive: room.isActive
        };

        socket.emit('joined-room', roomData);
        socket.to(room._id.toString()).emit('user-joined', { 
          username: user.username,
          userId: user._id.toString()
        });

        // Send chat history
        const chatHistory = await ChatMessage.find({ roomId: room._id })
          .sort({ timestamp: -1 })
          .limit(50)
          .populate('replyTo', 'message username timestamp');

        socket.emit('chat-history', chatHistory.reverse());

        // Send join message
        const joinMessage = new ChatMessage({
          roomId: room._id,
          userId: user._id,
          username: 'System',
          message: `${user.username} joined the room`,
          type: 'system'
        });
        await joinMessage.save();
        io.to(room._id.toString()).emit('chat-message', joinMessage);

      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Enhanced drawing events
    socket.on('draw-start', async (data) => {
      socket.to(data.roomId).emit('draw-start', {
        ...data,
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('draw-move', async (data) => {
      socket.to(data.roomId).emit('draw-move', {
        ...data,
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('draw-end', async (data) => {
      try {
        socket.to(data.roomId).emit('draw-end', {
          ...data,
          userId: socket.userId,
          username: socket.username
        });

        // Save to database
        const room = await Room.findById(data.roomId);
        if (room) {
          room.boardData.paths.push({
            ...data.path,
            userId: socket.userId,
            username: socket.username
          });
          room.boardData.version += 1;
          room.boardData.lastModified = new Date();
          room.lastActivity = new Date();
          await room.save();
        }
      } catch (error) {
        console.error('Draw end error:', error);
      }
    });

    socket.on('draw-shape', async (data) => {
      try {
        socket.to(data.roomId).emit('draw-shape', {
          ...data,
          userId: socket.userId,
          username: socket.username
        });

        // Save to database
        const room = await Room.findById(data.roomId);
        if (room) {
          room.boardData.shapes.push({
            ...data.shape,
            userId: socket.userId,
            username: socket.username
          });
          room.boardData.version += 1;
          room.boardData.lastModified = new Date();
          room.lastActivity = new Date();
          await room.save();
        }
      } catch (error) {
        console.error('Draw shape error:', error);
      }
    });

    socket.on('add-text', async (data) => {
      try {
        socket.to(data.roomId).emit('add-text', {
          ...data,
          userId: socket.userId,
          username: socket.username
        });

        // Save to database
        const room = await Room.findById(data.roomId);
        if (room) {
          room.boardData.texts.push({
            ...data.text,
            userId: socket.userId,
            username: socket.username
          });
          room.boardData.version += 1;
          room.boardData.lastModified = new Date();
          room.lastActivity = new Date();
          await room.save();
        }
      } catch (error) {
        console.error('Add text error:', error);
      }
    });

    // Handle media embedding
    socket.on('add-media', async (data) => {
      try {
        socket.to(data.roomId).emit('add-media', {
          ...data,
          userId: socket.userId,
          username: socket.username
        });

        // Save to database
        const room = await Room.findById(data.roomId);
        if (room) {
          room.boardData.media.push({
            ...data.media,
            userId: socket.userId,
            username: socket.username
          });
          room.boardData.version += 1;
          room.boardData.lastModified = new Date();
          room.lastActivity = new Date();
          await room.save();
        }
      } catch (error) {
        console.error('Add media error:', error);
      }
    });

    socket.on('remove-media', async (data) => {
      try {
        socket.to(data.roomId).emit('remove-media', data);

        // Remove from database
        const room = await Room.findById(data.roomId);
        if (room) {
          room.boardData.media = room.boardData.media.filter(
            media => media.id !== data.mediaId
          );
          room.boardData.version += 1;
          room.boardData.lastModified = new Date();
          room.lastActivity = new Date();
          await room.save();
        }
      } catch (error) {
        console.error('Remove media error:', error);
      }
    });

    // Handle board clear
    socket.on('clear-board', async (data) => {
      try {
        const room = await Room.findById(data.roomId);
        if (room) {
          // Check if user is host or moderator
          const member = room.members.find(
            m => m.userId.toString() === socket.userId
          );

          if (member && (member.role === 'host' || member.role === 'moderator')) {
            // Clear the board
            room.boardData = {
              paths: [],
              shapes: [],
              texts: [],
              media: [],
              stickers: [],
              version: room.boardData.version + 1,
              lastModified: new Date()
            };
            room.lastActivity = new Date();
            await room.save();

            io.to(data.roomId).emit('board-cleared');
          } else {
            socket.emit('error', { message: 'Insufficient permissions' });
          }
        }
      } catch (error) {
        console.error('Clear board error:', error);
      }
    });

    // Enhanced chat with database persistence
    socket.on('chat-message', async (data) => {
      try {
        const user = await User.findById(socket.userId);
        if (!user) return;

        const message = new ChatMessage({
          roomId: data.roomId,
          userId: user._id,
          username: user.username,
          message: data.message,
          attachments: data.attachments || [],
          replyTo: data.replyTo || null
        });

        await message.save();

        const populatedMessage = await ChatMessage.findById(message._id)
          .populate('replyTo', 'message username timestamp');

        const responseMessage = {
          id: populatedMessage._id.toString(),
          username: populatedMessage.username,
          message: populatedMessage.message,
          type: populatedMessage.type,
          attachments: populatedMessage.attachments,
          replyTo: populatedMessage.replyTo ? {
            id: populatedMessage.replyTo._id.toString(),
            message: populatedMessage.replyTo.message,
            username: populatedMessage.replyTo.username,
            timestamp: populatedMessage.replyTo.timestamp
          } : null,
          isEdited: populatedMessage.isEdited,
          editedAt: populatedMessage.editedAt,
          timestamp: populatedMessage.timestamp
        };

        io.to(data.roomId).emit('chat-message', responseMessage);

        // Update room activity
        await Room.findByIdAndUpdate(data.roomId, { lastActivity: new Date() });

      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    // Enhanced cursor tracking
    socket.on('cursor-move', (data) => {
      const roomId = data.roomId;
      
      if (!cursorPositions.has(roomId)) {
        cursorPositions.set(roomId, new Map());
      }

      const roomCursors = cursorPositions.get(roomId);
      roomCursors.set(socket.userId, {
        userId: socket.userId,
        username: socket.username,
        position: data.position,
        tool: data.tool,
        color: data.color,
        timestamp: Date.now()
      });

      socket.to(roomId).emit('cursor-move', {
        userId: socket.userId,
        username: socket.username,
        position: data.position,
        tool: data.tool,
        color: data.color,
        roomId: roomId
      });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.username} (${socket.id})`);

      try {
        // Update user's last active time
        await User.findByIdAndUpdate(socket.userId, { lastActive: new Date() });

        // Remove from active connections
        activeConnections.delete(socket.id);

        // Handle room cleanup
        for (const [roomId, socketIds] of roomConnections.entries()) {
          if (socketIds.has(socket.id)) {
            socketIds.delete(socket.id);

            // Update room member's last active time
            const room = await Room.findById(roomId);
            if (room) {
              const member = room.members.find(
                m => m.userId.toString() === socket.userId
              );
              if (member) {
                member.lastActive = new Date();
              }

              // If host leaves and there are other members, transfer host
              if (room.host.toString() === socket.userId && room.members.length > 1) {
                const newHost = room.members.find(
                  m => m.userId.toString() !== socket.userId
                );
                if (newHost) {
                  room.host = newHost.userId;
                  newHost.role = 'host';
                  socket.to(roomId).emit('host-changed', {
                    id: newHost.userId.toString(),
                    username: newHost.username
                  });
                }
              }

              room.lastActivity = new Date();
              await room.save();

              socket.to(roomId).emit('user-left', { 
                username: socket.username,
                userId: socket.userId
              });
            }

            // Remove cursor
            if (cursorPositions.has(roomId)) {
              cursorPositions.get(roomId).delete(socket.userId);
            }

            // Clean up empty room connections
            if (socketIds.size === 0) {
              roomConnections.delete(roomId);
              cursorPositions.delete(roomId);
            }
          }
        }
      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
    });

  } catch (error) {
    console.error('Socket connection error:', error);
    socket.disconnect();
  }
});

// Enhanced REST API endpoints
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find({
      isActive: true,
      'settings.isPublic': true
    })
    .select('name members settings.maxMembers createdAt host')
    .populate('host', 'username')
    .sort({ lastActivity: -1 })
    .limit(50);

    const roomList = rooms.map(room => ({
      id: room._id.toString(),
      name: room.name,
      memberCount: room.members.length,
      maxMembers: room.settings.maxMembers,
      created: room.createdAt,
      host: {
        id: room.host._id.toString(),
        username: room.host.username
      }
    }));

    res.json(roomList);
  } catch (error) {
    console.error('Fetch rooms error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('host', 'username avatar')
      .populate('members.userId', 'username avatar');

    if (!room || !room.isActive) {
      return res.status(404).json({ message: 'Room not found' });
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
      created: room.createdAt,
      lastActivity: room.lastActivity,
      isActive: room.isActive
    };

    res.json(roomData);
  } catch (error) {
    console.error('Fetch room error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeConnections: activeConnections.size,
    activeRooms: roomConnections.size
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Enhanced collaborative whiteboard server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    mongoose.connection.close();
  });
});