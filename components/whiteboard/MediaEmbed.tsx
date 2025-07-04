'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MediaService } from '@/lib/media-service';
import { MediaElement } from '@/types/whiteboard';
import { 
  Plus, 
  Youtube, 
  FileText, 
  Image, 
  Globe, 
  Figma,
  Github,
  FileSpreadsheet,
  X,
  Move,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface MediaEmbedProps {
  roomId: string;
  onAddMedia: (media: Omit<MediaElement, 'id' | 'timestamp' | 'userId'>) => void;
  mediaElements: MediaElement[];
  onUpdateMedia: (id: string, updates: Partial<MediaElement>) => void;
  onRemoveMedia: (id: string) => void;
}

export default function MediaEmbed({ 
  roomId, 
  onAddMedia, 
  mediaElements, 
  onUpdateMedia, 
  onRemoveMedia 
}: MediaEmbedProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddMedia = async () => {
    if (!url.trim() || !MediaService.isValidUrl(url)) {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    try {
      const mediaType = MediaService.getMediaType(url);
      const metadata = await MediaService.getUrlMetadata(url);
      
      const mediaElement: Omit<MediaElement, 'id' | 'timestamp' | 'userId'> = {
        type: mediaType,
        url,
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        title: metadata.title,
        thumbnail: metadata.thumbnail
      };

      onAddMedia(mediaElement);
      setUrl('');
      setIsDialogOpen(false);
      toast.success('Media added successfully!');
    } catch (error) {
      toast.error('Failed to add media');
    } finally {
      setIsLoading(false);
    }
  };

  const getMediaIcon = (type: MediaElement['type']) => {
    switch (type) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-500" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-600" />;
      case 'image':
        return <Image className="w-4 h-4 text-green-500" />;
      case 'figma':
        return <Figma className="w-4 h-4 text-purple-500" />;
      case 'github-gist':
        return <Github className="w-4 h-4 text-gray-800" />;
      case 'google-docs':
        return <FileSpreadsheet className="w-4 h-4 text-blue-500" />;
      default:
        return <Globe className="w-4 h-4 text-blue-500" />;
    }
  };

  const renderMediaEmbed = (media: MediaElement) => {
    const { type, url, size, title } = media;

    switch (type) {
      case 'youtube':
        const embedUrl = MediaService.getYouTubeEmbedUrl(url);
        return (
          <iframe
            src={embedUrl}
            width={size.width}
            height={size.height}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title || 'YouTube Video'}
          />
        );

      case 'figma':
        const figmaEmbedUrl = MediaService.getFigmaEmbedUrl(url);
        return (
          <iframe
            src={figmaEmbedUrl}
            width={size.width}
            height={size.height}
            frameBorder="0"
            title={title || 'Figma Design'}
          />
        );

      case 'github-gist':
        return (
          <iframe
            src={MediaService.getGitHubGistEmbedUrl(url)}
            width={size.width}
            height={size.height}
            frameBorder="0"
            title={title || 'GitHub Gist'}
          />
        );

      case 'pdf':
        return (
          <iframe
            src={`${url}#view=FitH`}
            width={size.width}
            height={size.height}
            frameBorder="0"
            title={title || 'PDF Document'}
          />
        );

      case 'image':
        return (
          <img
            src={url}
            alt={title || 'Embedded Image'}
            style={{ width: size.width, height: size.height, objectFit: 'contain' }}
          />
        );

      case 'google-docs':
        return (
          <iframe
            src={url.replace('/edit', '/preview')}
            width={size.width}
            height={size.height}
            frameBorder="0"
            title={title || 'Google Docs'}
          />
        );

      default:
        return (
          <iframe
            src={url}
            width={size.width}
            height={size.height}
            frameBorder="0"
            title={title || 'Web Page'}
            sandbox="allow-scripts allow-same-origin"
          />
        );
    }
  };

  return (
    <>
      {/* Add Media Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Media
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Media</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Enter URL (YouTube, Figma, PDF, etc.)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMedia()}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Youtube className="w-3 h-3" />
                YouTube
              </div>
              <div className="flex items-center gap-1">
                <Figma className="w-3 h-3" />
                Figma
              </div>
              <div className="flex items-center gap-1">
                <Github className="w-3 h-3" />
                GitHub Gist
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                PDF
              </div>
              <div className="flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3" />
                Google Docs
              </div>
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Web Pages
              </div>
            </div>

            <Button
              onClick={handleAddMedia}
              disabled={!url.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? 'Adding...' : 'Add Media'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Render Media Elements */}
      {mediaElements.map((media) => (
        <div
          key={media.id}
          className="absolute border-2 border-blue-300 rounded-lg overflow-hidden group"
          style={{
            left: media.position.x,
            top: media.position.y,
            width: media.size.width,
            height: media.size.height
          }}
        >
          {/* Media Controls */}
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onRemoveMedia(media.id)}
                className="w-6 h-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Media Header */}
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 text-xs flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {getMediaIcon(media.type)}
            <span className="truncate">{media.title || media.url}</span>
            <Badge variant="secondary" className="text-xs">
              {media.type}
            </Badge>
          </div>

          {/* Media Content */}
          <div className="w-full h-full">
            {renderMediaEmbed(media)}
          </div>
        </div>
      ))}
    </>
  );
}