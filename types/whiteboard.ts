export interface User {
  id: string;
  username: string;
  email?: string;
  rooms: string[];
  created: Date;
  avatar?: string;
  status?: 'online' | 'away' | 'busy';
}

export interface Room {
  id: string;
  name: string;
  host: string;
  members: RoomMember[];
  created: Date;
  boardData: BoardData;
  isActive: boolean;
  template?: WhiteboardTemplate;
  settings: RoomSettings;
}

export interface RoomMember {
  id: string;
  username: string;
  role: 'host' | 'guest';
  cursor?: CursorPosition;
  following?: string; // ID of user being followed
  avatar?: string;
  status?: 'online' | 'away' | 'busy';
}

export interface RoomSettings {
  allowGuests: boolean;
  maxMembers: number;
  isPublic: boolean;
  recordSession: boolean;
}

export interface BoardData {
  paths: DrawPath[];
  shapes: DrawShape[];
  texts: DrawText[];
  media: MediaElement[];
  stickers: StickerNote[];
  snapshots: BoardSnapshot[];
  version: number;
}

export interface DrawPath {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser' | 'highlighter';
  timestamp: Date;
  userId: string;
  pressure?: number[];
}

export interface DrawShape {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle' | 'diamond';
  startPoint: Point;
  endPoint: Point;
  color: string;
  width: number;
  fill?: string;
  timestamp: Date;
  userId: string;
}

export interface DrawText {
  id: string;
  text: string;
  position: Point;
  color: string;
  fontSize: number;
  fontFamily: string;
  timestamp: Date;
  userId: string;
  isEditable: boolean;
  rotation?: number;
  background?: string;
}

export interface MediaElement {
  id: string;
  type: 'youtube' | 'pdf' | 'image' | 'webpage' | 'figma' | 'github-gist' | 'google-docs';
  url: string;
  position: Point;
  size: { width: number; height: number };
  title?: string;
  thumbnail?: string;
  timestamp: Date;
  userId: string;
}

export interface StickerNote {
  id: string;
  text: string;
  position: Point;
  color: string;
  size: 'small' | 'medium' | 'large';
  timestamp: Date;
  userId: string;
  voiceNote?: VoiceNote;
  attachments?: string[];
}

export interface VoiceNote {
  id: string;
  audioUrl: string;
  duration: number;
  transcription?: string;
  timestamp: Date;
}

export interface BoardSnapshot {
  id: string;
  timestamp: Date;
  data: Omit<BoardData, 'snapshots'>;
  description?: string;
  userId: string;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system' | 'ai';
  attachments?: string[];
  replyTo?: string;
}

export interface CursorPosition {
  userId: string;
  username: string;
  position: Point;
  roomId: string;
  color: string;
  avatar?: string;
  tool?: DrawTool;
  isDrawing?: boolean;
}

export interface WhiteboardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'education' | 'design' | 'planning';
  thumbnail: string;
  elements: TemplateElement[];
  isCustom: boolean;
}

export interface TemplateElement {
  type: 'shape' | 'text' | 'sticky' | 'media';
  data: any;
  position: Point;
  size?: { width: number; height: number };
}



export interface SessionReplay {
  id: string;
  roomId: string;
  startTime: Date;
  endTime?: Date;
  events: ReplayEvent[];
  participants: string[];
}

export interface ReplayEvent {
  timestamp: Date;
  type: string;
  userId: string;
  data: any;
}

export type DrawTool =
  | 'pen'
  | 'eraser'
  | 'highlighter'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'triangle'
  | 'diamond'
  | 'text'
  | 'sticky'
  | 'select'
  | 'hand'
  | 'laser';

export type ViewMode = 'normal' | 'following' | 'presentation' | 'focus';