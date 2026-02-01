import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RtmpDestination } from '@/types/streaming';

export function useDestinations() {
  return useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rtmp_destinations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RtmpDestination[];
    },
  });
}

export function useCreateDestination() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (destination: Omit<RtmpDestination, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('rtmp_destinations')
        .insert(destination)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('rtmp_destinations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('rtmp_destinations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
    },
  });
}
