import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DestinationDialog } from '@/components/destinations/DestinationDialog';
import { useDestinations, useDeleteDestination, useUpdateDestination } from '@/hooks/useDestinations';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Tv2, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { RtmpDestination, platformConfigs, Platform } from '@/types/streaming';
import { cn } from '@/lib/utils';
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

export default function DestinationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RtmpDestination | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<RtmpDestination | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  
  const { data: destinations = [], isLoading } = useDestinations();
  const deleteMutation = useDeleteDestination();
  const updateMutation = useUpdateDestination();

  const handleEdit = (dest: RtmpDestination) => {
    setEditTarget(dest);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Destination deleted successfully');
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete destination');
    }
  };

  const toggleActive = async (dest: RtmpDestination) => {
    try {
      await updateMutation.mutateAsync({ id: dest.id, is_active: !dest.is_active });
      toast.success(dest.is_active ? 'Destination deactivated' : 'Destination activated');
    } catch (error) {
      toast.error('Failed to update destination');
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditTarget(undefined);
  };

  return (
    <MainLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">RTMP Destinations</h1>
            <p className="mt-1 text-muted-foreground">
              Configure your streaming platforms and endpoints
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Destination
          </Button>
        </div>

        {/* Destinations List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : destinations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16">
            <Tv2 className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">No destinations yet</h3>
            <p className="mt-2 text-muted-foreground">
              Add your first streaming platform
            </p>
            <Button className="mt-6" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Destination
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {destinations.map((dest) => {
              const platform = dest.platform as Platform;
              const config = platformConfigs[platform] || platformConfigs.custom;
              
              return (
                <div
                  key={dest.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-6"
                >
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', config.color)}>
                    <span className="text-lg font-bold text-white">
                      {dest.platform.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">{dest.name}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {config.name}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {dest.rtmp_url}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Key:</span>
                      <code className="rounded bg-muted px-2 py-0.5 text-sm">
                        {showKeys[dest.id] ? dest.stream_key : '••••••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleShowKey(dest.id)}
                      >
                        {showKeys[dest.id] ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Active</span>
                      <Switch
                        checked={dest.is_active}
                        onCheckedChange={() => toggleActive(dest)}
                      />
                    </div>
                    
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(dest)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(dest)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Destination Dialog */}
        <DestinationDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          destination={editTarget}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Destination</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
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
