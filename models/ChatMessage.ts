import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  _id: string;
  roomId: string;
  userId: string;
  username: string;
  message: string;
  type: 'user' | 'system' | 'ai';
  attachments: string[];
  replyTo?: string;
  isEdited: boolean;
  editedAt?: Date;
  timestamp: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['user', 'system', 'ai'],
    default: 'user'
  },
  attachments: [{
    type: String
  }],
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ChatMessageSchema.index({ roomId: 1, timestamp: 1 });
ChatMessageSchema.index({ userId: 1 });

export default mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);