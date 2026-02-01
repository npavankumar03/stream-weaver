import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StreamCard } from '@/components/streams/StreamCard';
import { CreateStreamDialog } from '@/components/streams/CreateStreamDialog';
import { useStreams, useStartStream, useStopStream, useDeleteStream, Stream } from '@/hooks/useStreams';
import { useVideos } from '@/hooks/useVideos';
import { useDestinations } from '@/hooks/useDestinations';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Radio } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function StreamsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Stream | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'scheduled' | 'completed'>('all');
  
  const { data: streams = [], isLoading } = useStreams();
  const { data: videos = [] } = useVideos();
  const { data: destinations = [] } = useDestinations();
  const startMutation = useStartStream();
  const stopMutation = useStopStream();
  const deleteMutation = useDeleteStream();

  const filteredStreams = streams.filter((stream) => {
    if (filter === 'all') return true;
    if (filter === 'live') return stream.status === 'live';
    if (filter === 'scheduled') return stream.status === 'scheduled';
    if (filter === 'completed') return ['completed', 'failed', 'cancelled'].includes(stream.status);
    return true;
  });

  const handleStart = async (stream: Stream) => {
    try {
      await startMutation.mutateAsync(stream.id);
      toast.success('Stream started!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start stream');
    }
  };

  const handleStop = async (stream: Stream) => {
    try {
      await stopMutation.mutateAsync(stream.id);
      toast.success('Stream stopped');
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop stream');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Stream deleted');
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete stream');
    }
  };

  const liveCount = streams.filter((s) => s.status === 'live').length;

  return (
    <MainLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Streams</h1>
            <p className="mt-1 text-muted-foreground">
              Create and manage your multi-destination streams
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Stream
          </Button>
        </div>

        {/* Live indicator */}
        {liveCount > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-live/10 border border-live/30 p-4">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-live">
              <Radio className="h-5 w-5 text-white" />
              <span className="absolute -right-0 -top-0 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-live" />
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {liveCount} stream{liveCount > 1 ? 's' : ''} live now
              </p>
              <p className="text-sm text-muted-foreground">Broadcasting to multiple destinations</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All ({streams.length})</TabsTrigger>
            <TabsTrigger value="live">Live ({streams.filter((s) => s.status === 'live').length})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled ({streams.filter((s) => s.status === 'scheduled').length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({streams.filter((s) => ['completed', 'failed', 'cancelled'].includes(s.status)).length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Streams Grid */}
        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filteredStreams.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16">
            <Radio className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {filter === 'all' ? 'No streams yet' : `No ${filter} streams`}
            </h3>
            <p className="mt-2 text-muted-foreground">
              Create your first multi-destination stream
            </p>
            <Button className="mt-6" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Stream
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredStreams.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                onStart={handleStart}
                onStop={handleStop}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}

        {/* Create Stream Dialog */}
        <CreateStreamDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          videos={videos}
          destinations={destinations}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Stream</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
