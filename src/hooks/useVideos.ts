import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Video } from '@/types/streaming';

export function useVideos() {
  return useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Video[];
    },
  });
}

export function useUploadVideo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);
      
      // Create video record
      const { data, error } = await supabase
        .from('videos')
        .insert({
          title: file.name.replace(/\.[^/.]+$/, ''),
          file_path: filePath,
          file_size: file.size,
          status: 'ready',
          thumbnail_url: publicUrl,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      // Delete from storage
      await supabase.storage
        .from('videos')
        .remove([video.file_path]);
      
      // Delete record
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}
