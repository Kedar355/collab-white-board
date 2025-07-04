'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { VoiceNote } from '@/types/whiteboard';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square,
  Volume2,
  FileAudio,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface VoiceNotesProps {
  onAddVoiceNote: (voiceNote: Omit<VoiceNote, 'id'>) => void;
  voiceNotes: VoiceNote[];
  onDeleteVoiceNote: (id: string) => void;
}

export default function VoiceNotes({ 
  onAddVoiceNote, 
  voiceNotes, 
  onDeleteVoiceNote 
}: VoiceNotesProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Here you would typically upload the audio to your server
        // For now, we'll create a local URL
        const voiceNote: Omit<VoiceNote, 'id'> = {
          audioUrl,
          duration: recordingTime,
          timestamp: new Date(),
          transcription: 'Transcription would be generated here...'
        };
        
        onAddVoiceNote(voiceNote);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
        toast.success('Voice note saved!');
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const playVoiceNote = (voiceNote: VoiceNote) => {
    if (playingId === voiceNote.id) {
      // Pause current playback
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      // Start new playback
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(voiceNote.audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingId(null);
      };
      
      audio.play();
      setPlayingId(voiceNote.id);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          <FileAudio className="w-5 h-5 text-green-500" />
          Voice Notes
          {voiceNotes.length > 0 && (
            <Badge variant="secondary">
              {voiceNotes.length}
            </Badge>
          )}
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              Recording
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="pt-0 flex flex-col h-80">
          {/* Recording Controls */}
          <div className="space-y-3 mb-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                className="w-full flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Start Recording
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recording...</span>
                  <span className="text-sm text-gray-500">
                    {formatDuration(recordingTime)}
                  </span>
                </div>
                <Progress value={(recordingTime % 60) * (100 / 60)} className="w-full" />
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="w-full flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop Recording
                </Button>
              </div>
            )}
          </div>

          {/* Voice Notes List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {voiceNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileAudio className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No voice notes yet</p>
                <p className="text-xs">Record your first voice note!</p>
              </div>
            ) : (
              voiceNotes.map((note) => (
                <Card key={note.id} className="border border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => playVoiceNote(note)}
                          className="w-8 h-8 p-0"
                        >
                          {playingId === note.id ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                        </Button>
                        <div>
                          <div className="text-sm font-medium">
                            {formatDuration(note.duration)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(note.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteVoiceNote(note.id)}
                        className="w-6 h-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    {note.transcription && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        {note.transcription}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}