import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomMember {
  userId: string;
  username: string;
  role: 'host' | 'moderator' | 'guest';
  joinedAt: Date;
  lastActive: Date;
}

export interface IBoardData {
  paths: any[];
  shapes: any[];
  texts: any[];
  media: any[];
  stickers: any[];
  version: number;
  lastModified: Date;
}

export interface IRoom extends Document {
  _id: string;
  name: string;
  description?: string;
  host: string;
  members: IRoomMember[];
  boardData: IBoardData;
  settings: {
    allowGuests: boolean;
    maxMembers: number;
    isPublic: boolean;
    recordSession: boolean;
    allowChat: boolean;
    allowVoiceNotes: boolean;
    allowMediaEmbed: boolean;
  };
  template?: string;
  isActive: boolean;
  lastActivity: Date;
  created: Date;
}

const RoomSchema = new Schema<IRoom>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  host: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['host', 'moderator', 'guest'],
      default: 'guest'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  }],
  boardData: {
    paths: [{
      type: Schema.Types.Mixed,
      default: []
    }],
    shapes: [{
      type: Schema.Types.Mixed,
      default: []
    }],
    texts: [{
      type: Schema.Types.Mixed,
      default: []
    }],
    media: [{
      type: Schema.Types.Mixed,
      default: []
    }],
    stickers: [{
      type: Schema.Types.Mixed,
      default: []
    }],
    version: {
      type: Number,
      default: 1
    },
    lastModified: {
      type: Date,
      default: Date.now
    }
  },
  settings: {
    allowGuests: {
      type: Boolean,
      default: true
    },
    maxMembers: {
      type: Number,
      default: 50,
      min: 1,
      max: 100
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    recordSession: {
      type: Boolean,
      default: false
    },
    allowChat: {
      type: Boolean,
      default: true
    },
    allowVoiceNotes: {
      type: Boolean,
      default: true
    },
    allowMediaEmbed: {
      type: Boolean,
      default: true
    }
  },
  template: {
    type: Schema.Types.ObjectId,
    ref: 'Template',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  created: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

RoomSchema.index({ host: 1 });
RoomSchema.index({ isActive: 1, isPublic: 1 });
RoomSchema.index({ lastActivity: 1 });
RoomSchema.index({ 'members.userId': 1 });

export default mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);