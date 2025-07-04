'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from '@/types/whiteboard';
import { Send, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ChatProps {
  roomId: string;
}

export default function Chat({ roomId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (socket) {
      socket.on('chat-message', (message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
      });

      socket.on('chat-history', (history: ChatMessage[]) => {
        setMessages(history);
      });

      return () => {
        socket.off('chat-message');
        socket.off('chat-history');
      };
    }
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    socket.emit('chat-message', {
      roomId,
      message: newMessage.trim()
    });

    setNewMessage('');
  };

  const formatTime = (date: Date) => {
    return format(new Date(date), 'HH:mm');
  };

  return (
    <Card className={`w-80 shadow-lg transition-all duration-300 ${isMinimized ? 'h-12' : 'h-96'
      }`}>
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat
          <span className="text-sm font-normal text-gray-500">
            ({messages.length})
          </span>
        </CardTitle>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-4 pt-0 flex flex-col h-80">
          <ScrollArea className="flex-1 mb-4 pr-2">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.type === 'system' ? 'items-center' : 'items-start'
                    }`}
                >
                  {message.type === 'system' ? (
                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {message.message}
                    </div>
                  ) : (
                    <div className={`max-w-[80%] ${message.username === user?.username
                      ? 'ml-auto'
                      : 'mr-auto'
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-600">
                          {message.username}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg text-sm ${message.username === user?.username
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                        }`}>
                        {message.message}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}