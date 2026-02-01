import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logsApi, LogEntry } from '@/lib/api';

export function useLogs(limit = 100, streamId?: string, level?: string) {
  return useQuery({
    queryKey: ['logs', limit, streamId, level],
    queryFn: () => logsApi.getAll(limit, streamId, level),
    refetchInterval: 3000, // Refresh every 3 seconds
    staleTime: 1000,
  });
}

export function useClearLogs() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (streamId?: string) => logsApi.clear(streamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
}

export function useLogStats() {
  return useQuery({
    queryKey: ['logs', 'stats'],
    queryFn: logsApi.getStats,
    refetchInterval: 5000,
  });
}

export { type LogEntry };
