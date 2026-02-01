import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Stream } from '@/types/streaming';
import { useEffect } from 'react';

export function useStreams() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streams')
        .select(`
          *,
          video:videos(*),
          destinations:stream_destinations(
            *,
            destination:rtmp_destinations(*)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Stream[];
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('streams-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'streams' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['streams'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stream_destinations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['streams'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
      const { destination_ids, ...streamData } = stream;
      
      // Create stream
      const { data: newStream, error: streamError } = await supabase
        .from('streams')
        .insert({
          ...streamData,
          status: stream.scheduled_at ? 'scheduled' : 'pending',
        })
        .select()
        .single();
      
      if (streamError) throw streamError;
      
      // Create stream destinations
      if (destination_ids.length > 0) {
        const { error: destError } = await supabase
          .from('stream_destinations')
          .insert(
            destination_ids.map(dest_id => ({
              stream_id: newStream.id,
              destination_id: dest_id,
            }))
          );
        
        if (destError) throw destError;
      }
      
      return newStream;
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
      const updates: Partial<Stream> = { status };
      
      if (status === 'live') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        updates.ended_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('streams')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('streams')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
}
