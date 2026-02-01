import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Video, RtmpDestination } from '@/types/streaming';
import { useCreateStream } from '@/hooks/useStreams';
import { toast } from 'sonner';
import { Loader2, Video as VideoIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  scheduled_at: z.string().optional(),
  loop_video: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateStreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videos: Video[];
  destinations: RtmpDestination[];
}

export function CreateStreamDialog({ open, onOpenChange, videos, destinations }: CreateStreamDialogProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  
  const createMutation = useCreateStream();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      scheduled_at: '',
      loop_video: false,
    },
  });

  const toggleDestination = (id: string) => {
    setSelectedDestinations((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedVideo) {
      toast.error('Please select a video');
      return;
    }
    if (selectedDestinations.length === 0) {
      toast.error('Please select at least one destination');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: data.title,
        description: data.description,
        video_id: selectedVideo,
        destination_ids: selectedDestinations,
        scheduled_at: data.scheduled_at || undefined,
        loop_video: data.loop_video,
      });
      toast.success('Stream created successfully!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create stream');
      console.error(error);
    }
  };

  const resetForm = () => {
    form.reset();
    setSelectedVideo(null);
    setSelectedDestinations([]);
    setStep(1);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Stream</DialogTitle>
        </DialogHeader>

        {/* Progress steps */}
        <div className="flex items-center gap-2 py-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                step >= s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
          ))}
          <div className="flex-1 space-y-1 pl-4">
            <p className="text-sm font-medium">
              {step === 1 && 'Select Video'}
              {step === 2 && 'Choose Destinations'}
              {step === 3 && 'Stream Details'}
            </p>
          </div>
        </div>

        {/* Step 1: Select Video */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid max-h-64 gap-2 overflow-y-auto">
              {videos.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                  No videos available. Upload a video first.
                </div>
              ) : (
                videos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video.id)}
                    className={cn(
                      'flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors',
                      selectedVideo === video.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <VideoIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{video.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(video.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {selectedVideo === video.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!selectedVideo}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Destinations */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid max-h-64 gap-2 overflow-y-auto">
              {destinations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                  No destinations configured. Add a destination first.
                </div>
              ) : (
                destinations.filter((d) => d.is_active).map((dest) => (
                  <div
                    key={dest.id}
                    onClick={() => toggleDestination(dest.id)}
                    className={cn(
                      'flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors',
                      selectedDestinations.includes(dest.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{dest.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{dest.platform}</p>
                    </div>
                    {selectedDestinations.includes(dest.id) && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={selectedDestinations.length === 0}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Stream Details */}
        {step === 3 && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Stream Title</Label>
              <Input
                id="title"
                placeholder="My Awesome Stream"
                {...form.register('title')}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Stream description..."
                rows={3}
                {...form.register('description')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Schedule (optional)</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                {...form.register('scheduled_at')}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to start manually
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label htmlFor="loop_video">Loop Video</Label>
                <p className="text-sm text-muted-foreground">
                  Continuously loop the video until stopped
                </p>
              </div>
              <Switch
                id="loop_video"
                checked={form.watch('loop_video')}
                onCheckedChange={(checked) => form.setValue('loop_video', checked)}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Stream'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
