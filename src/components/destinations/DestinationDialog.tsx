import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Platform, platformConfigs, RtmpDestination } from '@/types/streaming';
import { useCreateDestination, useUpdateDestination } from '@/hooks/useDestinations';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  platform: z.string().min(1, 'Platform is required'),
  rtmp_url: z.string().url('Must be a valid URL'),
  stream_key: z.string().min(1, 'Stream key is required'),
});

type FormData = z.infer<typeof formSchema>;

interface DestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination?: RtmpDestination;
}

export function DestinationDialog({ open, onOpenChange, destination }: DestinationDialogProps) {
  const [showStreamKey, setShowStreamKey] = useState(false);
  const isEditing = !!destination;
  
  const createMutation = useCreateDestination();
  const updateMutation = useUpdateDestination();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: destination?.name || '',
      platform: destination?.platform || 'youtube',
      rtmp_url: destination?.rtmp_url || platformConfigs.youtube.defaultUrl,
      stream_key: destination?.stream_key || '',
    },
  });

  const selectedPlatform = form.watch('platform') as Platform;

  const handlePlatformChange = (platform: Platform) => {
    form.setValue('platform', platform);
    if (!isEditing) {
      form.setValue('rtmp_url', platformConfigs[platform].defaultUrl);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: destination.id, ...data, is_active: true });
        toast.success('Destination updated successfully!');
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          platform: data.platform,
          rtmp_url: data.rtmp_url,
          stream_key: data.stream_key,
          is_active: true,
        });
        toast.success('Destination added successfully!');
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to save destination');
      console.error(error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Destination' : 'Add Destination'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My YouTube Channel"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={selectedPlatform} onValueChange={(v) => handlePlatformChange(v as Platform)}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(platformConfigs).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rtmp_url">RTMP URL</Label>
            <Input
              id="rtmp_url"
              placeholder="rtmp://..."
              {...form.register('rtmp_url')}
            />
            {form.formState.errors.rtmp_url && (
              <p className="text-sm text-destructive">{form.formState.errors.rtmp_url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stream_key">Stream Key</Label>
            <div className="relative">
              <Input
                id="stream_key"
                type={showStreamKey ? 'text' : 'password'}
                placeholder="Your stream key"
                {...form.register('stream_key')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                onClick={() => setShowStreamKey(!showStreamKey)}
              >
                {showStreamKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {form.formState.errors.stream_key && (
              <p className="text-sm text-destructive">{form.formState.errors.stream_key.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Destination'
              ) : (
                'Add Destination'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
