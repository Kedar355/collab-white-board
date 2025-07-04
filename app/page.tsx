'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Room } from '@/types/whiteboard';
import LoginForm from '@/components/auth/LoginForm';
import RoomList from '@/components/room/RoomList';
import EnhancedWhiteboard from '@/components/whiteboard/EnhancedWhiteboard';

export default function Home() {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const { isAuthenticated } = useAuth();

  const handleRoomJoin = (room: Room) => {
    setCurrentRoom(room);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  if (currentRoom) {
    return (
      <EnhancedWhiteboard
        room={currentRoom}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return (
    <RoomList onRoomJoin={handleRoomJoin} />
  );
}