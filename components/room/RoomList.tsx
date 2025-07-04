'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { Room } from '@/types/whiteboard';
import { Plus, Users, Calendar, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface RoomListProps {
  onRoomJoin: (room: Room) => void;
}

export default function RoomList({ onRoomJoin }: RoomListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (socket) {
      socket.on('room-created', (room: Room) => {
        setRooms(prev => [...prev, room]);
        setIsCreateDialogOpen(false);
        setNewRoomName('');
        toast.success(`Room "${room.name}" created successfully!`);
      });

      socket.on('joined-room', (room: Room) => {
        onRoomJoin(room);
      });

      socket.on('error', (error: { message: string }) => {
        toast.error(error.message);
        setIsLoading(false);
      });

      // Fetch existing rooms
      fetchRooms();

      return () => {
        socket.off('room-created');
        socket.off('joined-room');
        socket.off('error');
      };
    }
  }, [socket, onRoomJoin]);

  const fetchRooms = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/rooms');
      const roomList = await response.json();
      setRooms(roomList);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const createRoom = () => {
    if (!socket || !newRoomName.trim()) return;

    setIsLoading(true);
    socket.emit('create-room', { roomName: newRoomName.trim() });
  };

  const joinRoom = (roomId: string) => {
    if (!socket || !roomId.trim()) return;

    setIsLoading(true);
    socket.emit('join-room', { roomId: roomId.trim() });
  };

  const handleJoinById = () => {
    if (!joinRoomId.trim()) return;

    joinRoom(joinRoomId.trim());
    setIsJoinDialogOpen(false);
    setJoinRoomId('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome, {user?.username}!
          </h1>
          <p className="text-gray-600">
            Join existing rooms or create your own collaborative space
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Room</DialogTitle>
                <DialogDescription>
                  Create a new collaborative whiteboard room
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">Room Name</Label>
                  <Input
                    id="room-name"
                    placeholder="Enter room name"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                  />
                </div>
                <Button
                  onClick={createRoom}
                  disabled={!newRoomName.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Creating...' : 'Create Room'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                Join by ID
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Room</DialogTitle>
                <DialogDescription>
                  Enter the room ID to join an existing room
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-id">Room ID</Label>
                  <Input
                    id="room-id"
                    placeholder="Enter room ID"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinById()}
                  />
                </div>
                <Button
                  onClick={handleJoinById}
                  disabled={!joinRoomId.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Joining...' : 'Join Room'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Active Rooms</h2>

          {rooms.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-gray-500 mb-4">
                  <Users className="w-12 h-12 mx-auto mb-2" />
                  <p>No active rooms found</p>
                </div>
                <p className="text-sm text-gray-400">
                  Create a new room to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <Card key={room.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{room.name}</span>
                      <Badge variant="secondary">
                        {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(room.created).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => joinRoom(room.id)}
                      className="w-full"
                      disabled={isLoading}
                    >
                      Join Room
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}