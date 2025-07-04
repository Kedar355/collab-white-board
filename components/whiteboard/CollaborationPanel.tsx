'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RoomMember, CursorPosition } from '@/types/whiteboard';
import { 
  Users, 
  Eye, 
  EyeOff, 
  Crown, 
  MousePointer,
  Palette,
  Hand
} from 'lucide-react';

interface CollaborationPanelProps {
  members: RoomMember[];
  currentUserId: string;
  onFollowUser: (userId: string) => void;
  onStopFollowing: () => void;
  followingUserId: string | null;
  cursors: Map<string, CursorPosition>;
}

export default function CollaborationPanel({
  members,
  currentUserId,
  onFollowUser,
  onStopFollowing,
  followingUserId,
  cursors
}: CollaborationPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const getInitials = (username: string) => {
    return username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserStatus = (userId: string) => {
    const cursor = cursors.get(userId);
    if (!cursor) return 'offline';
    
    const lastActivity = Date.now() - cursor.position.x; // Simplified activity check
    if (lastActivity < 30000) return 'active';
    if (lastActivity < 300000) return 'idle';
    return 'away';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'away': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const getCurrentTool = (userId: string) => {
    const cursor = cursors.get(userId);
    return cursor?.tool || 'select';
  };

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'pen': return <Palette className="w-3 h-3" />;
      case 'select': return <MousePointer className="w-3 h-3" />;
      case 'hand': return <Hand className="w-3 h-3" />;
      default: return <MousePointer className="w-3 h-3" />;
    }
  };

  return (
    <Card className={`w-80 shadow-lg transition-all duration-300 ${
      isMinimized ? 'h-16' : 'h-96'
    }`}>
      <CardHeader 
        className="pb-3 cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          Collaborators
          <Badge variant="secondary">
            {members.length}
          </Badge>
          {followingUserId && (
            <Badge variant="default" className="bg-blue-500">
              Following
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="pt-0 space-y-3">
          <div className="space-y-2">
            {members.map((member) => {
              const isCurrentUser = member.id === currentUserId;
              const isFollowing = followingUserId === member.id;
              const status = getUserStatus(member.id);
              const currentTool = getCurrentTool(member.id);
              
              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                  } ${isFollowing ? 'ring-2 ring-blue-300' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div 
                        className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(status)}`}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {member.username}
                          {isCurrentUser && ' (You)'}
                        </span>
                        {member.role === 'host' && (
                          <Crown className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="capitalize">{status}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {getToolIcon(currentTool)}
                          <span className="capitalize">{currentTool}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {!isCurrentUser && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant={isFollowing ? "default" : "outline"}
                            onClick={() => isFollowing ? onStopFollowing() : onFollowUser(member.id)}
                            className="w-8 h-8 p-0"
                          >
                            {isFollowing ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isFollowing ? 'Stop following' : 'Follow user'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            })}
          </div>
          
          {followingUserId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Eye className="w-4 h-4" />
                <span>Following mode active</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Your view will follow the selected user's actions
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={onStopFollowing}
                className="mt-2 w-full"
              >
                Stop Following
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}