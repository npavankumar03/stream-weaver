import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { videosApi, Video } from '@/lib/api';

export function useVideos() {
  return useQuery({
    queryKey: ['videos'],
    queryFn: videosApi.getAll,
  });
}

export function useUploadVideo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File) => {
      return videosApi.upload(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (video: Video) => {
      await videosApi.delete(video.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export { type Video };
