import { useState } from 'react';
import { useLogs, useClearLogs, LogEntry } from '@/hooks/useLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Search, AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LogViewerProps {
  streamId?: string;
  className?: string;
  maxHeight?: string;
}

export function LogViewer({ streamId, className, maxHeight = '400px' }: LogViewerProps) {
  const [filter, setFilter] = useState('');
  const [level, setLevel] = useState<string>('all');
  
  const { data: logs = [], isLoading, refetch } = useLogs(
    500,
    streamId,
    level !== 'all' ? level : undefined
  );
  const clearMutation = useClearLogs();

  const filteredLogs = logs.filter((log) => {
    if (!filter) return true;
    return (
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.streamId?.toLowerCase().includes(filter.toLowerCase())
    );
  });

  const handleClear = async () => {
    try {
      await clearMutation.mutateAsync(streamId);
      toast.success('Logs cleared');
    } catch {
      toast.error('Failed to clear logs');
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      case 'warn':
        return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
      case 'debug':
        return <Bug className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return <Info className="h-3.5 w-3.5 text-primary" />;
    }
  };

  const getLevelBadge = (level: LogEntry['level']) => {
    const variants: Record<LogEntry['level'], string> = {
      error: 'bg-destructive/10 text-destructive border-destructive/20',
      warn: 'bg-warning/10 text-warning border-warning/20',
      debug: 'bg-muted text-muted-foreground border-muted',
      info: 'bg-primary/10 text-primary border-primary/20',
    };
    
    return (
      <Badge variant="outline" className={cn('text-xs', variants[level])}>
        {level}
      </Badge>
    );
  };

  return (
    <div className={cn('rounded-lg border border-border', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClear}
          disabled={clearMutation.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Log entries */}
      <ScrollArea className="p-2" style={{ maxHeight }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Loading logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Info className="h-8 w-8 mb-2" />
            <p>No logs found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <div
                key={`${log.timestamp}-${index}`}
                className={cn(
                  'flex items-start gap-2 rounded px-2 py-1.5 text-sm font-mono',
                  log.level === 'error' && 'bg-destructive/5',
                  log.level === 'warn' && 'bg-warning/5'
                )}
              >
                <span className="mt-0.5">{getLevelIcon(log.level)}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                {log.streamId && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {log.streamId.slice(0, 8)}
                  </Badge>
                )}
                <span className="flex-1 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <span>{filteredLogs.length} entries</span>
        <span>Auto-refresh: 3s</span>
      </div>
    </div>
  );
}
