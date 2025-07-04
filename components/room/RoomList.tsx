'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { Room } from '@/types/whiteboard';
import { Plus, Users, Calendar, ArrowRight, Settings, Loader2, Search, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface RoomListProps {
  onRoomJoin: (room: Room) => void;
}

export default function RoomList({ onRoomJoin }: RoomListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomSettings, setRoomSettings] = useState({
    isPublic: true,
    allowGuests: true,
    maxMembers: 50,
    allowChat: true,
    allowVoiceNotes: true,
    allowMediaEmbed: true
  });

  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('room-created', handleRoomCreated);
      socket.on('joined-room', handleRoomJoined);
      socket.on('error', handleSocketError);

      return () => {
        socket.off('room-created');
        socket.off('joined-room');
        socket.off('error');
      };
    }
  }, [socket]);

  useEffect(() => {
    const filtered = rooms.filter(room =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredRooms(filtered);
  }, [rooms, searchQuery]);

  const fetchRooms = async () => {
    try {
      setIsLoadingRooms(true);
      const response = await fetch('/api/rooms');
      if (response.ok) {
        const roomList = await response.json();
        setRooms(roomList);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const handleRoomCreated = (room: Room) => {
    setRooms(prev => [room, ...prev]);
    setIsCreateDialogOpen(false);
    resetCreateForm();
    toast.success(`Room "${room.name}" created successfully!`);
  };

  const handleRoomJoined = (room: Room) => {
    onRoomJoin(room);
  };

  const handleSocketError = (error: { message: string }) => {
    toast.error(error.message);
    setIsLoading(false);
  };

  const resetCreateForm = () => {
    setNewRoomName('');
    setNewRoomDescription('');
    setRoomSettings({
      isPublic: true,
      allowGuests: true,
      maxMembers: 50,
      allowChat: true,
      allowVoiceNotes: true,
      allowMediaEmbed: true
    });
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error('Room name is required');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newRoomName.trim(),
          description: newRoomDescription.trim(),
          settings: roomSettings
        })
      });

      if (response.ok) {
        const room = await response.json();
        if (socket) {
          socket.emit('create-room', { 
            roomName: room.name,
            roomId: room.id,
            settings: roomSettings
          });
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create room');
      }
    } catch (error) {
      console.error('Create room error:', error);
      toast.error('Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async (roomId: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const room = await response.json();
        if (socket) {
          socket.emit('join-room', { roomId });
        }
        onRoomJoin(room);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to join room');
      }
    } catch (error) {
      console.error('Join room error:', error);
      toast.error('Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinById = () => {
    if (!joinRoomId.trim()) {
      toast.error('Room ID is required');
      return;
    }

    joinRoom(joinRoomId.trim());
    setIsJoinDialogOpen(false);
    setJoinRoomId('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-gray-600 text-lg">
            Join existing rooms or create your own collaborative space
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                <Plus className="w-5 h-5" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Room</DialogTitle>
                <DialogDescription>
                  Create a new collaborative whiteboard room with custom settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">Room Name *</Label>
                  <Input
                    id="room-name"
                    placeholder="Enter room name"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    maxLength={100}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room-description">Description (optional)</Label>
                  <Textarea
                    id="room-description"
                    placeholder="Describe your room..."
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Room Settings</Label>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="public-room" className="text-sm">Public Room</Label>
                    <Switch
                      id="public-room"
                      checked={roomSettings.isPublic}
                      onCheckedChange={(checked) => 
                        setRoomSettings(prev => ({ ...prev, isPublic: checked }))
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow-guests" className="text-sm">Allow Guests</Label>
                    <Switch
                      id="allow-guests"
                      checked={roomSettings.allowGuests}
                      onCheckedChange={(checked) => 
                        setRoomSettings(prev => ({ ...prev, allowGuests: checked }))
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-members" className="text-sm">Max Members</Label>
                    <Input
                      id="max-members"
                      type="number"
                      min={1}
                      max={100}
                      value={roomSettings.maxMembers}
                      onChange={(e) => 
                        setRoomSettings(prev => ({ 
                          ...prev, 
                          maxMembers: parseInt(e.target.value) || 50 
                        }))
                      }
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  onClick={createRoom}
                  disabled={!newRoomName.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Room'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="flex items-center gap-2 shadow-md">
                <ArrowRight className="w-5 h-5" />
                Join by ID
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
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
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={handleJoinById}
                  disabled={!joinRoomId.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Room'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 shadow-md"
            />
          </div>
        </div>

        {/* Rooms List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Active Rooms</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRooms}
              disabled={isLoadingRooms}
              className="flex items-center gap-2"
            >
              {isLoadingRooms ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Refresh'
              )}
            </Button>
          </div>

          {isLoadingRooms ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-gray-500 mb-4">
                  <Users className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">
                    {searchQuery ? 'No rooms found' : 'No active rooms found'}
                  </p>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : 'Create a new room to get started!'
                  }
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Room
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
                <Card 
                  key={room.id} 
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer border-0 shadow-md bg-white/80 backdrop-blur-sm"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate text-lg">{room.name}</span>
                      <div className="flex items-center gap-2">
                        {room.host === user?.id && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {room.memberCount}/{room.maxMembers || 50}
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      {new Date(room.created).toLocaleDateString()}
                      <span>•</span>
                      <Users className="w-4 h-4" />
                      {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      onClick={() => joinRoom(room.id)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                      disabled={isLoading || room.memberCount >= (room.maxMembers || 50)}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : room.memberCount >= (room.maxMembers || 50) ? (
                        'Room Full'
                      ) : (
                        'Join Room'
                      )}
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