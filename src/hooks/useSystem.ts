import { useQuery } from '@tanstack/react-query';
import { systemApi } from '@/lib/api';

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: systemApi.health,
    refetchInterval: 10000, // Check every 10 seconds
    retry: 1,
    staleTime: 5000,
  });
}

export function useSystemInfo() {
  return useQuery({
    queryKey: ['system', 'info'],
    queryFn: systemApi.info,
    staleTime: 30000,
  });
}
