import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { VideoCard } from '@/components/videos/VideoCard';
import { VideoUploadDialog } from '@/components/videos/VideoUploadDialog';
import { useVideos, useDeleteVideo } from '@/hooks/useVideos';
import { Button } from '@/components/ui/button';
import { Upload, Video } from 'lucide-react';
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
import { Video as VideoType } from '@/types/streaming';

export default function VideosPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VideoType | null>(null);
  
  const { data: videos = [], isLoading } = useVideos();
  const deleteMutation = useDeleteVideo();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success('Video deleted successfully');
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete video');
    }
  };

  return (
    <MainLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Video Library</h1>
            <p className="mt-1 text-muted-foreground">
              Upload and manage your video files
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Video
          </Button>
        </div>

        {/* Videos Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-video animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16">
            <Video className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">No videos yet</h3>
            <p className="mt-2 text-muted-foreground">
              Upload your first video to get started
            </p>
            <Button className="mt-6" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Video
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}

        {/* Upload Dialog */}
        <VideoUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Video</AlertDialogTitle>
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
