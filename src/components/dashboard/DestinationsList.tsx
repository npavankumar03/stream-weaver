import { RtmpDestination, platformConfigs, Platform } from '@/types/streaming';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';

interface DestinationsListProps {
  destinations: RtmpDestination[];
}

export function DestinationsList({ destinations }: DestinationsListProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h3 className="text-lg font-semibold text-foreground">RTMP Destinations</h3>
      </div>
      <div className="divide-y divide-border">
        {destinations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No destinations configured. Add your first platform!
          </div>
        ) : (
          destinations.slice(0, 5).map((dest) => {
            const platform = dest.platform as Platform;
            const config = platformConfigs[platform] || platformConfigs.custom;
            
            return (
              <div key={dest.id} className="flex items-center gap-4 p-4">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', config.color)}>
                  <span className="text-sm font-bold text-white">
                    {dest.platform.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-foreground">{dest.name}</p>
                  <p className="text-sm text-muted-foreground">{config.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {dest.is_active ? (
                    <div className="flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">Inactive</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
