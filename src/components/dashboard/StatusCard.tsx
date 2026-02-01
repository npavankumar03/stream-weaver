import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: 'default' | 'live' | 'scheduled' | 'success';
}

export function StatusCard({ title, value, icon: Icon, trend, variant = 'default' }: StatusCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className="mt-1 text-sm text-muted-foreground">{trend}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            variant === 'live' && 'bg-live/20 text-live',
            variant === 'scheduled' && 'bg-scheduled/20 text-scheduled',
            variant === 'success' && 'bg-success/20 text-success',
            variant === 'default' && 'bg-primary/20 text-primary'
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
