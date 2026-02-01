import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { streamsApi, Stream } from '@/lib/api';

export function useStreams() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['streams'],
    queryFn: streamsApi.getAll,
    refetchInterval: 5000, // Poll every 5 seconds for status updates
  });

  return query;
}

export function useCreateStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (stream: {
      title: string;
      description?: string;
      video_id: string;
      scheduled_at?: string;
      loop_video?: boolean;
      destination_ids: string[];
    }) => {
      return streamsApi.create(stream);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
}

export function useUpdateStreamStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Stream['status'] }) => {
      return streamsApi.updateStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
}

export function useDeleteStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await streamsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
}

export function useStartStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return streamsApi.start(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
}

export function useStopStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return streamsApi.stop(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
}

export { type Stream };
