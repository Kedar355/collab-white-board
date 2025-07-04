'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { Room, DrawTool, MediaElement, VoiceNote, WhiteboardTemplate, SessionReplay } from '@/types/whiteboard';
import DrawingCanvas from './DrawingCanvas';
import EnhancedDrawingTools from './EnhancedDrawingTools';
import Chat from './Chat';
import MediaEmbed from './MediaEmbed';
import VoiceNotes from './VoiceNotes';
import TemplateSelector from './TemplateSelector';
import CollaborationPanel from './CollaborationPanel';
import SessionReplayComponent from './SessionReplay';
import { ocrService } from '@/lib/ocr-service';
import { TemplateService } from '@/lib/templates';
import { Users, Copy, LogOut, Crown, Settings, Maximize, Minimize } from 'lucide-react';
import { toast } from 'sonner';

interface EnhancedWhiteboardProps {
  room: Room;
  onLeaveRoom: () => void;
}

export default function EnhancedWhiteboard({ room, onLeaveRoom }: EnhancedWhiteboardProps) {
  const [activeTool, setActiveTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [members, setMembers] = useState(room.members);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [boardElements, setBoardElements] = useState<any[]>([]);
  const [mediaElements, setMediaElements] = useState<MediaElement[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [customTemplates, setCustomTemplates] = useState<WhiteboardTemplate[]>([]);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<Map<string, any>>(new Map());
  const [sessionReplay, setSessionReplay] = useState<SessionReplay | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (socket) {
      socket.on('user-joined', (data: { username: string }) => {
        toast.success(`${data.username} joined the room`);
      });

      socket.on('user-left', (data: { username: string }) => {
        toast.info(`${data.username} left the room`);
      });

      socket.on('host-changed', (newHost: { id: string; username: string }) => {
        toast.info(`${newHost.username} is now the host`);
      });

      return () => {
        socket.off('user-joined');
        socket.off('user-left');
        socket.off('host-changed');
      };
    }
  }, [socket]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
        }
      } else {
        switch (e.key.toLowerCase()) {
          case 'p': setActiveTool('pen'); break;
          case 'e': setActiveTool('eraser'); break;
          case 'r': setActiveTool('rectangle'); break;
          case 'c': setActiveTool('circle'); break;
          case 't': setActiveTool('triangle'); break;
          case 'l': setActiveTool('line'); break;
          case 'a': setActiveTool('arrow'); break;
          case 'x': setActiveTool('text'); break;
          case 's': setActiveTool('sticky'); break;
          case 'v': setActiveTool('select'); break;
          case 'h': setActiveTool('highlighter'); break;
          case 'q': setActiveTool('laser'); break;
          case ' ':
            e.preventDefault();
            setActiveTool('hand');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    toast.success('Room ID copied to clipboard!');
  };

  const handleUndo = () => {
    if (socket) {
      socket.emit('undo', { roomId: room.id });
    }
  };

  const handleRedo = () => {
    if (socket) {
      socket.emit('redo', { roomId: room.id });
    }
  };

  const handleClearBoard = () => {
    if (socket) {
      socket.emit('clear-board', { roomId: room.id });
      toast.success('Board cleared');
    }
  };



  const handleAddMedia = (media: Omit<MediaElement, 'id' | 'timestamp' | 'userId'>) => {
    const newMedia: MediaElement = {
      ...media,
      id: `media-${Date.now()}`,
      timestamp: new Date(),
      userId: user?.id || ''
    };

    setMediaElements(prev => [...prev, newMedia]);

    if (socket) {
      socket.emit('add-media', {
        roomId: room.id,
        media: newMedia
      });
    }
  };

  const handleUpdateMedia = (id: string, updates: Partial<MediaElement>) => {
    setMediaElements(prev => prev.map(media =>
      media.id === id ? { ...media, ...updates } : media
    ));
  };

  const handleRemoveMedia = (id: string) => {
    setMediaElements(prev => prev.filter(media => media.id !== id));

    if (socket) {
      socket.emit('remove-media', {
        roomId: room.id,
        mediaId: id
      });
    }
  };

  const handleAddVoiceNote = (voiceNote: Omit<VoiceNote, 'id'>) => {
    const newVoiceNote: VoiceNote = {
      ...voiceNote,
      id: `voice-${Date.now()}`
    };

    setVoiceNotes(prev => [...prev, newVoiceNote]);
  };

  const handleDeleteVoiceNote = (id: string) => {
    setVoiceNotes(prev => prev.filter(note => note.id !== id));
  };

  const handleSelectTemplate = (template: WhiteboardTemplate) => {
    // Apply template to the board
    if (socket) {
      socket.emit('apply-template', {
        roomId: room.id,
        template
      });
    }
    toast.success(`Template "${template.name}" applied!`);
  };

  const handleSaveAsTemplate = () => {
    const templateName = prompt('Enter template name:');
    if (templateName) {
      const customTemplate = TemplateService.createCustomTemplate(
        templateName,
        'Custom template created from current board',
        [] // Would extract current board elements
      );
      setCustomTemplates(prev => [...prev, customTemplate]);
      toast.success('Template saved!');
    }
  };

  const handleFollowUser = (userId: string) => {
    setFollowingUserId(userId);
    toast.info(`Following ${members.find(m => m.id === userId)?.username}`);
  };

  const handleStopFollowing = () => {
    setFollowingUserId(null);
    toast.info('Stopped following');
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    // Start session recording
    toast.success('Session recording started');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // Stop session recording
    toast.success('Session recording stopped');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const isHost = room.host === user?.id;

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'} bg-gray-50 flex flex-col`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{room.name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{members.length} members</span>
                {isHost && <Crown className="w-4 h-4 text-yellow-500" />}

              </div>
            </div>
            <Badge variant="secondary" className="cursor-pointer" onClick={copyRoomId}>
              <Copy className="w-3 h-3 mr-1" />
              {room.id.slice(0, 8)}...
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <TemplateSelector
              onSelectTemplate={handleSelectTemplate}
              customTemplates={customTemplates}
              onSaveAsTemplate={handleSaveAsTemplate}
            />

            <MediaEmbed
              roomId={room.id}
              onAddMedia={handleAddMedia}
              mediaElements={mediaElements}
              onUpdateMedia={handleUpdateMedia}
              onRemoveMedia={handleRemoveMedia}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="flex items-center gap-2"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onLeaveRoom}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Drawing Tools */}
        <div className="p-4">
          <EnhancedDrawingTools
            activeTool={activeTool}
            onToolChange={setActiveTool}
            color={color}
            onColorChange={setColor}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClearBoard={handleClearBoard}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>

        {/* Canvas */}
        <div className="flex-1 p-4 pr-0">
          <Card className="w-full h-full shadow-lg relative">
            <CardContent className="p-0 w-full h-full">
              <DrawingCanvas
                roomId={room.id}
                tool={activeTool}
                color={color}
                brushSize={brushSize}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />

              {/* Media Elements Overlay */}
              <MediaEmbed
                roomId={room.id}
                onAddMedia={handleAddMedia}
                mediaElements={mediaElements}
                onUpdateMedia={handleUpdateMedia}
                onRemoveMedia={handleRemoveMedia}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="p-4 space-y-4 w-96">
          <Chat roomId={room.id} />

          <CollaborationPanel
            members={members}
            currentUserId={user?.id || ''}
            onFollowUser={handleFollowUser}
            onStopFollowing={handleStopFollowing}
            followingUserId={followingUserId}
            cursors={cursors}
          />



          <VoiceNotes
            onAddVoiceNote={handleAddVoiceNote}
            voiceNotes={voiceNotes}
            onDeleteVoiceNote={handleDeleteVoiceNote}
          />

          {room.settings.recordSession && (
            <SessionReplayComponent
              roomId={room.id}
              sessionData={sessionReplay}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              isRecording={isRecording}
              canRecord={isHost}
            />
          )}
        </div>
      </div>
    </div>
  );
}