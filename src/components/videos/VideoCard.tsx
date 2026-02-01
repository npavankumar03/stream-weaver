import { Video } from '@/types/streaming';
import { format } from 'date-fns';
import { Video as VideoIcon, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VideoCardProps {
  video: Video;
  onDelete: (video: Video) => void;
  onSelect?: (video: Video) => void;
  selected?: boolean;
}

export function VideoCard({ video, onDelete, onSelect, selected }: VideoCardProps) {
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown duration';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-card transition-all ${
        selected ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        <div className="flex h-full items-center justify-center">
          <VideoIcon className="h-12 w-12 text-muted-foreground" />
        </div>
        
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="bg-black/70 text-white">
            {formatDuration(video.duration)}
          </Badge>
        </div>

        {/* Hover overlay */}
        {onSelect && (
          <div
            className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onSelect(video)}
          >
            <Play className="h-12 w-12 text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h4 className="truncate font-medium text-foreground">{video.title}</h4>
        <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatFileSize(video.file_size)}</span>
          <span>{format(new Date(video.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 bg-black/50 opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(video);
        }}
      >
        <Trash2 className="h-4 w-4 text-white" />
      </Button>
    </div>
  );
}
