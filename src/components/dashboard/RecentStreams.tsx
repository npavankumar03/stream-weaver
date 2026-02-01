import { Stream } from '@/types/streaming';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Radio, Clock, CheckCircle2, XCircle, CalendarClock } from 'lucide-react';

interface RecentStreamsProps {
  streams: Stream[];
}

const statusConfig = {
  live: { icon: Radio, color: 'text-live', bg: 'bg-live/20', label: 'Live' },
  scheduled: { icon: CalendarClock, color: 'text-scheduled', bg: 'bg-scheduled/20', label: 'Scheduled' },
  pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Pending' },
  completed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/20', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/20', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Cancelled' },
};

export function RecentStreams({ streams }: RecentStreamsProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Streams</h3>
      </div>
      <div className="divide-y divide-border">
        {streams.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No streams yet. Create your first stream!
          </div>
        ) : (
          streams.slice(0, 5).map((stream) => {
            const config = statusConfig[stream.status];
            const StatusIcon = config.icon;
            
            return (
              <div key={stream.id} className="flex items-center gap-4 p-4">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', config.bg)}>
                  <StatusIcon className={cn('h-5 w-5', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-foreground">{stream.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {stream.destinations?.length || 0} destinations
                  </p>
                </div>
                <div className="text-right">
                  <span className={cn('text-sm font-medium', config.color)}>
                    {config.label}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(stream.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
