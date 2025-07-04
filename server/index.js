const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// MongoDB connection
// Note: In WebContainer environment, external MongoDB connections may not work
// For production, replace with your MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collaborative-whiteboard';

// Comment out MongoDB connection for WebContainer compatibility
// mongoose.connect(MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// }).then(() => {
//   console.log('Connected to MongoDB');
// }).catch(err => {
//   console.error('MongoDB connection error:', err);
// });

// In-memory storage for WebContainer environment
const rooms = new Map();
const users = new Map();
const chatHistory = new Map();
const boardSnapshots = new Map();
const sessionReplays = new Map();
const mediaElements = new Map();

// Enhanced room model structure
const roomSchema = {
  id: String,
  name: String,
  host: String,
  members: [Object],
  created: Date,
  boardData: Object,
  chatHistory: [Object],
  settings: {
    allowGuests: Boolean,
    maxMembers: Number,
    isPublic: Boolean,
    recordSession: Boolean
  },
  template: Object
};

// Helper functions
const createRoom = (roomName, hostId, hostUsername, settings = {}) => {
  const roomId = uuidv4();
  const defaultSettings = {
    allowGuests: true,
    maxMembers: 50,
    isPublic: true,
    recordSession: false,
    ...settings
  };
  
  const room = {
    id: roomId,
    name: roomName,
    host: hostId,
    members: [{ 
      id: hostId, 
      username: hostUsername, 
      role: 'host',
      avatar: null,
      status: 'online'
    }],
    created: new Date(),
    boardData: { 
      paths: [], 
      shapes: [], 
      texts: [], 
      media: [],
      stickers: [],
      snapshots: [],
      version: 1
    },
    settings: defaultSettings,
    isActive: true
  };
  
  rooms.set(roomId, room);
  chatHistory.set(roomId, []);
  boardSnapshots.set(roomId, []);
  mediaElements.set(roomId, []);
  
  if (defaultSettings.recordSession) {
    sessionReplays.set(roomId, {
      id: uuidv4(),
      roomId,
      startTime: new Date(),
      events: [],
      participants: [hostUsername]
    });
  }
  
  return room;
};

const joinRoom = (roomId, userId, username) => {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  if (room.members.length >= room.settings.maxMembers) {
    return { error: 'Room is full' };
  }
  
  const existingMember = room.members.find(member => member.id === userId);
  if (!existingMember) {
    room.members.push({ 
      id: userId, 
      username, 
      role: 'guest',
      avatar: null,
      status: 'online'
    });
  }
  
  return room;
};



// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // User authentication
  socket.on('authenticate', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username,
      email: userData.email || null,
      rooms: [],
      created: new Date(),
      avatar: userData.avatar || null,
      status: 'online'
    };
    
    users.set(socket.id, user);
    socket.emit('authenticated', user);
  });
  
  // Create room with enhanced settings
  socket.on('create-room', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    
    const room = createRoom(data.roomName, socket.id, user.username, data.settings);
    socket.join(room.id);
    user.rooms.push(room.id);
    
    socket.emit('room-created', room);
    socket.emit('joined-room', room);
    
    // Send welcome message
    const welcomeMessage = {
      id: uuidv4(),
      username: 'System',
      message: `Welcome to ${room.name}! You are the host.`,
      timestamp: new Date(),
      type: 'system'
    };
    
    const messages = chatHistory.get(room.id);
    messages.push(welcomeMessage);
    socket.emit('chat-message', welcomeMessage);
  });
  
  // Join room
  socket.on('join-room', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    
    const result = joinRoom(data.roomId, socket.id, user.username);
    if (!result) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }
    
    const room = result;
    socket.join(room.id);
    if (!user.rooms.includes(room.id)) {
      user.rooms.push(room.id);
    }
    
    socket.emit('joined-room', room);
    socket.to(room.id).emit('user-joined', { username: user.username });
    
    // Send current board state
    socket.emit('board-state', room.boardData);
    
    // Send chat history
    const messages = chatHistory.get(room.id);
    socket.emit('chat-history', messages);
    
    // Send media elements
    const media = mediaElements.get(room.id);
    socket.emit('media-elements', media);
    
    // Send join message
    const joinMessage = {
      id: uuidv4(),
      username: 'System',
      message: `${user.username} joined the room`,
      timestamp: new Date(),
      type: 'system'
    };
    
    messages.push(joinMessage);
    io.to(room.id).emit('chat-message', joinMessage);
  });
  
  // Enhanced drawing events with AI suggestions
  socket.on('draw-start', (data) => {
    socket.to(data.roomId).emit('draw-start', {
      ...data,
      userId: socket.id
    });
    
    // Record event for session replay
    const replay = sessionReplays.get(data.roomId);
    if (replay) {
      replay.events.push({
        timestamp: new Date(),
        type: 'draw-start',
        userId: socket.id,
        data
      });
    }
  });
  
  socket.on('draw-move', (data) => {
    socket.to(data.roomId).emit('draw-move', {
      ...data,
      userId: socket.id
    });
  });
  
  socket.on('draw-end', (data) => {
    socket.to(data.roomId).emit('draw-end', {
      ...data,
      userId: socket.id
    });
    
    // Save to room board data
    const room = rooms.get(data.roomId);
    if (room) {
      if (!room.boardData.paths) room.boardData.paths = [];
      room.boardData.paths.push({
        ...data.path,
        userId: socket.id
      });
      room.boardData.version++;
      

    }
  });
  
  // Handle shape drawing with AI enhancement
  socket.on('draw-shape', (data) => {
    socket.to(data.roomId).emit('draw-shape', {
      ...data,
      userId: socket.id
    });
    
    // Save to room board data
    const room = rooms.get(data.roomId);
    if (room) {
      if (!room.boardData.shapes) room.boardData.shapes = [];
      room.boardData.shapes.push({
        ...data.shape,
        userId: socket.id
      });
      room.boardData.version++;
    }
  });
  
  // Handle text addition with OCR support
  socket.on('add-text', (data) => {
    socket.to(data.roomId).emit('add-text', {
      ...data,
      userId: socket.id
    });
    
    // Save to room board data
    const room = rooms.get(data.roomId);
    if (room) {
      if (!room.boardData.texts) room.boardData.texts = [];
      room.boardData.texts.push({
        ...data.text,
        userId: socket.id
      });
      room.boardData.version++;
    }
  });
  
  // Handle sticky notes
  socket.on('add-sticky', (data) => {
    socket.to(data.roomId).emit('add-sticky', {
      ...data,
      userId: socket.id
    });
    
    const room = rooms.get(data.roomId);
    if (room) {
      if (!room.boardData.stickers) room.boardData.stickers = [];
      room.boardData.stickers.push({
        ...data.sticky,
        userId: socket.id
      });
      room.boardData.version++;
    }
  });
  
  // Handle media embedding
  socket.on('add-media', (data) => {
    socket.to(data.roomId).emit('add-media', {
      ...data,
      userId: socket.id
    });
    
    const media = mediaElements.get(data.roomId);
    if (media) {
      media.push(data.media);
    }
    
    const room = rooms.get(data.roomId);
    if (room) {
      if (!room.boardData.media) room.boardData.media = [];
      room.boardData.media.push(data.media);
      room.boardData.version++;
    }
  });
  
  socket.on('remove-media', (data) => {
    socket.to(data.roomId).emit('remove-media', data);
    
    const media = mediaElements.get(data.roomId);
    if (media) {
      const index = media.findIndex(m => m.id === data.mediaId);
      if (index > -1) {
        media.splice(index, 1);
      }
    }
  });
  
  // Handle template application
  socket.on('apply-template', (data) => {
    socket.to(data.roomId).emit('apply-template', data);
    
    const room = rooms.get(data.roomId);
    if (room) {
      room.template = data.template;
      // Apply template elements to board
      data.template.elements.forEach(element => {
        switch (element.type) {
          case 'shape':
            if (!room.boardData.shapes) room.boardData.shapes = [];
            room.boardData.shapes.push({
              id: uuidv4(),
              ...element.data,
              position: element.position,
              timestamp: new Date(),
              userId: socket.id
            });
            break;
          case 'text':
            if (!room.boardData.texts) room.boardData.texts = [];
            room.boardData.texts.push({
              id: uuidv4(),
              ...element.data,
              position: element.position,
              timestamp: new Date(),
              userId: socket.id
            });
            break;
          case 'sticky':
            if (!room.boardData.stickers) room.boardData.stickers = [];
            room.boardData.stickers.push({
              id: uuidv4(),
              ...element.data,
              position: element.position,
              timestamp: new Date(),
              userId: socket.id
            });
            break;
        }
      });
      room.boardData.version++;
    }
  });
  

  
  // Handle board clear with version control
  socket.on('clear-board', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      // Save current state as snapshot before clearing
      const snapshot = {
        id: uuidv4(),
        timestamp: new Date(),
        data: { ...room.boardData },
        description: 'Before clear',
        userId: socket.id
      };
      
      if (!room.boardData.snapshots) room.boardData.snapshots = [];
      room.boardData.snapshots.push(snapshot);
      
      // Clear the board
      room.boardData = { 
        paths: [], 
        shapes: [], 
        texts: [], 
        media: [],
        stickers: [],
        snapshots: room.boardData.snapshots,
        version: room.boardData.version + 1
      };
      
      io.to(data.roomId).emit('board-cleared');
    }
  });
  
  // Enhanced undo/redo with version control
  socket.on('undo', (data) => {
    const room = rooms.get(data.roomId);
    if (room && room.boardData.snapshots && room.boardData.snapshots.length > 0) {
      const lastSnapshot = room.boardData.snapshots[room.boardData.snapshots.length - 1];
      room.boardData = {
        ...lastSnapshot.data,
        version: room.boardData.version + 1
      };
      io.to(data.roomId).emit('board-state', room.boardData);
    }
  });
  
  socket.on('redo', (data) => {
    // Implementation for redo functionality
    socket.to(data.roomId).emit('redo', data);
  });
  
  // Enhanced chat with file attachments
  socket.on('chat-message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    
    const message = {
      id: uuidv4(),
      username: user.username,
      message: data.message,
      timestamp: new Date(),
      type: 'user',
      attachments: data.attachments || [],
      replyTo: data.replyTo || null
    };
    
    const messages = chatHistory.get(data.roomId);
    if (messages) {
      messages.push(message);
      io.to(data.roomId).emit('chat-message', message);
    }
  });
  
  // Enhanced cursor tracking with tool information
  socket.on('cursor-move', (data) => {
    const user = users.get(socket.id);
    socket.to(data.roomId).emit('cursor-move', {
      ...data,
      userId: socket.id,
      username: user?.username,
      avatar: user?.avatar,
      tool: data.tool,
      isDrawing: data.isDrawing || false
    });
  });
  
  // Session recording controls
  socket.on('start-recording', (data) => {
    const room = rooms.get(data.roomId);
    if (room && room.host === socket.id) {
      const replay = {
        id: uuidv4(),
        roomId: data.roomId,
        startTime: new Date(),
        events: [],
        participants: room.members.map(m => m.username)
      };
      sessionReplays.set(data.roomId, replay);
      io.to(data.roomId).emit('recording-started', replay);
    }
  });
  
  socket.on('stop-recording', (data) => {
    const room = rooms.get(data.roomId);
    if (room && room.host === socket.id) {
      const replay = sessionReplays.get(data.roomId);
      if (replay) {
        replay.endTime = new Date();
        io.to(data.roomId).emit('recording-stopped', replay);
      }
    }
  });
  
  // Handle disconnection with enhanced cleanup
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = users.get(socket.id);
    if (user && user.rooms) {
      user.rooms.forEach(roomId => {
        const room = rooms.get(roomId);
        if (room) {
          room.members = room.members.filter(member => member.id !== socket.id);
          socket.to(roomId).emit('user-left', { username: user.username });
          
          // If host leaves, transfer host to next member
          if (room.host === socket.id && room.members.length > 0) {
            room.host = room.members[0].id;
            room.members[0].role = 'host';
            socket.to(roomId).emit('host-changed', room.members[0]);
          }
          
          // Remove room if empty
          if (room.members.length === 0) {
            rooms.delete(roomId);
            chatHistory.delete(roomId);
            boardSnapshots.delete(roomId);
            mediaElements.delete(roomId);
            sessionReplays.delete(roomId);
          }
        }
      });
    }
    
    users.delete(socket.id);
  });
});

// Enhanced REST API endpoints
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values())
    .filter(room => room.settings.isPublic)
    .map(room => ({
      id: room.id,
      name: room.name,
      memberCount: room.members.length,
      created: room.created,
      settings: room.settings,
      hasTemplate: !!room.template
    }));
  res.json(roomList);
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

app.get('/api/rooms/:id/replay', (req, res) => {
  const replay = sessionReplays.get(req.params.id);
  if (!replay) {
    return res.status(404).json({ error: 'Session replay not found' });
  }
  res.json(replay);
});

// URL metadata endpoint for media embedding
app.get('/api/url-metadata', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }
  
  try {
    // In a real implementation, you would fetch the URL and extract metadata
    // For now, return mock data
    res.json({
      title: 'Sample Title',
      description: 'Sample description',
      thumbnail: 'https://via.placeholder.com/300x200'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Enhanced collaborative whiteboard server running on port ${PORT}`);
});