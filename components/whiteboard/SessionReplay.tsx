'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { SessionReplay, ReplayEvent } from '@/types/whiteboard';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  Clock,
  Users,
  Download
} from 'lucide-react';
import { format } from 'date-fns';

interface SessionReplayProps {
  roomId: string;
  sessionData: SessionReplay | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  isRecording: boolean;
  canRecord: boolean;
}

export default function SessionReplay({
  roomId,
  sessionData,
  onStartRecording,
  onStopRecording,
  isRecording,
  canRecord
}: SessionReplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMinimized, setIsMinimized] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  const totalDuration = sessionData 
    ? (sessionData.endTime?.getTime() || Date.now()) - sessionData.startTime.getTime()
    : 0;

  useEffect(() => {
    if (isPlaying && sessionData) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + (100 * playbackSpeed);
          if (next >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return next;
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalDuration, sessionData]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0]);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const exportSession = () => {
    if (!sessionData) return;
    
    const dataStr = JSON.stringify(sessionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-${sessionData.id}-${format(sessionData.startTime, 'yyyy-MM-dd-HH-mm')}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={`w-80 shadow-lg transition-all duration-300 ${
      isMinimized ? 'h-16' : 'h-64'
    }`}>
      <CardHeader 
        className="pb-3 cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Session Replay
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              Recording
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="pt-0 space-y-4">
          {/* Recording Controls */}
          <div className="flex gap-2">
            {canRecord && (
              <>
                {!isRecording ? (
                  <Button
                    size="sm"
                    onClick={onStartRecording}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onStopRecording}
                    className="flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    Stop Recording
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Playback Controls */}
          {sessionData && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{sessionData.participants.length} participants</span>
                  <span>•</span>
                  <span>{format(sessionData.startTime, 'MMM d, HH:mm')}</span>
                </div>
                
                <Slider
                  value={[currentTime]}
                  max={totalDuration}
                  step={100}
                  onValueChange={handleSeek}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(totalDuration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStop}
                    disabled={currentTime === 0}
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  {!isPlaying ? (
                    <Button
                      size="sm"
                      onClick={handlePlay}
                      disabled={currentTime >= totalDuration}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handlePause}
                    >
                      <Pause className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentTime(totalDuration)}
                    disabled={currentTime >= totalDuration}
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={playbackSpeed}
                    onChange={(e) => handleSpeedChange(Number(e.target.value))}
                    className="text-xs border rounded px-1 py-0.5"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportSession}
                    className="p-1"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {!sessionData && !isRecording && (
            <div className="text-center py-4 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No session data available</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}