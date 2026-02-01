import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Info, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Configure your streaming server and application settings
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* FFmpeg Setup */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>FFmpeg Configuration</CardTitle>
                  <CardDescription>Required for RTMP streaming</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  To enable actual RTMP streaming, you'll need to install FFmpeg on your Linux server:
                </p>
                <code className="block rounded bg-background p-3 text-sm">
                  sudo apt update && sudo apt install ffmpeg
                </code>
              </div>
              
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  This frontend manages stream configurations. The actual streaming 
                  requires a backend service running FFmpeg to re-stream your videos.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Backend Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Backend Requirements</CardTitle>
              <CardDescription>Self-hosted streaming setup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">FFmpeg</span>
                  <Badge variant="outline">Required</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">Node.js / Deno</span>
                  <Badge variant="outline">For backend service</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">Linux Server</span>
                  <Badge variant="outline">Ubuntu/Debian recommended</Badge>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                The stream management logic uses FFmpeg to read video files and 
                output to multiple RTMP destinations simultaneously.
              </p>
            </CardContent>
          </Card>

          {/* Architecture Overview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Architecture Overview</CardTitle>
              <CardDescription>How StreamFlow works</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/50 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/20">
                      <span className="text-2xl font-bold text-primary">1</span>
                    </div>
                    <h4 className="font-semibold">Upload Videos</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload video files to the storage bucket
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/20">
                      <span className="text-2xl font-bold text-primary">2</span>
                    </div>
                    <h4 className="font-semibold">Configure Destinations</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add RTMP endpoints for YouTube, Twitch, etc.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/20">
                      <span className="text-2xl font-bold text-primary">3</span>
                    </div>
                    <h4 className="font-semibold">Create & Schedule Streams</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Multi-stream to all destinations at once
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
