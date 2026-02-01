import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { destinationsApi, RtmpDestination } from '@/lib/api';

export function useDestinations() {
  return useQuery({
    queryKey: ['destinations'],
    queryFn: destinationsApi.getAll,
  });
}

export function useCreateDestination() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (destination: Omit<RtmpDestination, 'id' | 'created_at' | 'updated_at'>) => {
      return destinationsApi.create(destination);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
    },
  });
}

export function useUpdateDestination() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RtmpDestination> & { id: string }) => {
      return destinationsApi.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
    },
  });
}

export function useDeleteDestination() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await destinationsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
    },
  });
}

export { type RtmpDestination };
