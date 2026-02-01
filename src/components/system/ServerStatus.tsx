import { useSystemHealth } from '@/hooks/useSystem';
import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, CheckCircle, XCircle, Server } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ServerStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function ServerStatus({ className, showDetails = false }: ServerStatusProps) {
  const { data: health, isLoading, isError, error } = useSystemHealth();

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: Activity,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        label: 'Connecting...',
        description: 'Checking server status',
      };
    }

    if (isError || !health) {
      return {
        icon: XCircle,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        label: 'Offline',
        description: error?.message || 'Cannot connect to server',
      };
    }

    if (health.ffmpeg === 'not found') {
      return {
        icon: AlertTriangle,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        label: 'Warning',
        description: 'FFmpeg not installed - streaming disabled',
      };
    }

    return {
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      label: 'Online',
      description: `Uptime: ${health.uptimeFormatted}`,
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  if (!showDetails) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', status.bgColor)}>
              <Icon className={cn('h-4 w-4', status.color)} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{status.label}</p>
            <p className="text-xs text-muted-foreground">{status.description}</p>
            {health && (
              <div className="mt-2 space-y-1 text-xs">
                <p>Active streams: {health.streams.active}</p>
                <p>Memory: {health.memory.heapUsed}</p>
                <p>Load: {health.system.loadAvg[0]?.toFixed(2)}</p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border p-4', className)}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', status.bgColor)}>
          <Icon className={cn('h-5 w-5', status.color)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{status.label}</span>
            {health && (
              <span className="text-xs text-muted-foreground">v{health.version}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{status.description}</p>
        </div>
      </div>

      {health && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Active Streams</div>
            <div className="text-lg font-semibold">{health.streams.active}</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Memory</div>
            <div className="text-lg font-semibold">{health.memory.heapUsed}</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">CPU Load</div>
            <div className="text-lg font-semibold">{health.system.loadAvg[0]?.toFixed(2)}</div>
          </div>
        </div>
      )}

      {health && (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform</span>
            <span>{health.system.platform} ({health.system.arch})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CPUs</span>
            <span>{health.system.cpus}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">FFmpeg</span>
            <span className={health.ffmpeg === 'available' ? 'text-success' : 'text-destructive'}>
              {health.ffmpeg === 'available' ? 'Installed' : 'Not Found'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
