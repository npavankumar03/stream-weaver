import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useUploadVideo } from '@/hooks/useVideos';
import { toast } from 'sonner';

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoUploadDialog({ open, onOpenChange }: VideoUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadMutation = useUploadVideo();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (files.length === 0) return;

    try {
      setUploadProgress(0);
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await uploadMutation.mutateAsync(files[0]);
      
      clearInterval(interval);
      setUploadProgress(100);
      
      toast.success('Video uploaded successfully!');
      setFiles([]);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to upload video');
      console.error(error);
    }
  };

  const removeFile = () => {
    setFiles([]);
    setUploadProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
        </DialogHeader>

        {files.length === 0 ? (
          <div
            {...getRootProps()}
            className={`flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {isDragActive ? (
                'Drop your video here...'
              ) : (
                <>
                  Drag and drop your video here, or{' '}
                  <span className="text-primary">browse</span>
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Supports MP4, MKV, AVI, MOV, WebM, FLV
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-foreground">{files[0].name}</p>
                <p className="text-sm text-muted-foreground">
                  {(files[0].size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                disabled={uploadMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {uploadMutation.isPending && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-center text-sm text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Video'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
