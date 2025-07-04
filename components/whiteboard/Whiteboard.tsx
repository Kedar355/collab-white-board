'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { Room, DrawTool } from '@/types/whiteboard';
import DrawingCanvas from './DrawingCanvas';
import DrawingTools from './DrawingTools';
import Chat from './Chat';
import { Users, Copy, LogOut, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface WhiteboardProps {
  room: Room;
  onLeaveRoom: () => void;
}

export default function Whiteboard({ room, onLeaveRoom }: WhiteboardProps) {
  const [activeTool, setActiveTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [members, setMembers] = useState(room.members);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
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

  const isHost = room.host === user?.id;

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
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
            <div className="flex items-center gap-2">
              {members.map((member) => (
                <Badge
                  key={member.id}
                  variant={member.role === 'host' ? 'default' : 'secondary'}
                >
                  {member.username}
                  {member.role === 'host' && <Crown className="w-3 h-3 ml-1" />}
                </Badge>
              ))}
            </div>
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
          <DrawingTools
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
          <Card className="w-full h-full shadow-lg">
            <CardContent className="p-0 w-full h-full">
              <DrawingCanvas
                roomId={room.id}
                tool={activeTool}
                color={color}
                brushSize={brushSize}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            </CardContent>
          </Card>
        </div>

        {/* Chat */}
        <div className="p-4">
          <Chat roomId={room.id} />
        </div>
      </div>
    </div>
  );
}