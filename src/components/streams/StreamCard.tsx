import { Stream, platformConfigs, Platform } from '@/types/streaming';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  Radio, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CalendarClock, 
  Play, 
  Square,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StreamCardProps {
  stream: Stream;
  onStart: (stream: Stream) => void;
  onStop: (stream: Stream) => void;
  onDelete: (stream: Stream) => void;
}

const statusConfig = {
  live: { icon: Radio, color: 'text-live', bg: 'bg-live', label: 'Live', pulse: true },
  scheduled: { icon: CalendarClock, color: 'text-scheduled', bg: 'bg-scheduled/20', label: 'Scheduled', pulse: false },
  pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Ready', pulse: false },
  completed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/20', label: 'Completed', pulse: false },
  failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/20', label: 'Failed', pulse: false },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Cancelled', pulse: false },
};

export function StreamCard({ stream, onStart, onStop, onDelete }: StreamCardProps) {
  const config = statusConfig[stream.status];
  const StatusIcon = config.icon;
  const isLive = stream.status === 'live';
  const canStart = stream.status === 'pending' || stream.status === 'scheduled';
  const canStop = stream.status === 'live';

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className={cn('relative flex h-10 w-10 items-center justify-center rounded-lg', config.bg)}>
            <StatusIcon className={cn('h-5 w-5', isLive ? 'text-white' : config.color)} />
            {config.pulse && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-live" />
              </span>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{stream.title}</h4>
            <p className="text-sm text-muted-foreground">
              {stream.video?.title || 'No video selected'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDelete(stream)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Destinations */}
      <div className="p-4">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Streaming to:</p>
        <div className="flex flex-wrap gap-2">
          {stream.destinations?.map((sd) => {
            const platform = (sd.destination?.platform || 'custom') as Platform;
            const platformConfig = platformConfigs[platform] || platformConfigs.custom;
            return (
              <Badge
                key={sd.id}
                variant="secondary"
                className={cn('gap-1', platformConfig.color, 'text-white')}
              >
                {sd.destination?.name || 'Unknown'}
              </Badge>
            );
          })}
          {(!stream.destinations || stream.destinations.length === 0) && (
            <span className="text-sm text-muted-foreground">No destinations</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border bg-muted/30 p-4">
        <div className="text-sm text-muted-foreground">
          {stream.scheduled_at ? (
            <>Scheduled: {format(new Date(stream.scheduled_at), 'MMM d, h:mm a')}</>
          ) : stream.started_at ? (
            <>Started: {format(new Date(stream.started_at), 'MMM d, h:mm a')}</>
          ) : (
            <>Created: {format(new Date(stream.created_at), 'MMM d, h:mm a')}</>
          )}
        </div>
        
        <div className="flex gap-2">
          {canStart && (
            <Button size="sm" onClick={() => onStart(stream)}>
              <Play className="mr-1 h-4 w-4" />
              Start
            </Button>
          )}
          {canStop && (
            <Button size="sm" variant="destructive" onClick={() => onStop(stream)}>
              <Square className="mr-1 h-4 w-4" />
              Stop
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
