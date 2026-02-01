import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServerStatus } from '@/components/system/ServerStatus';
import { LogViewer } from '@/components/system/LogViewer';
import { Server, Info, Terminal, Activity } from 'lucide-react';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Monitor server health and view system logs
          </p>
        </div>

        <Tabs defaultValue="status" className="space-y-6">
          <TabsList>
            <TabsTrigger value="status" className="gap-2">
              <Activity className="h-4 w-4" />
              Server Status
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Terminal className="h-4 w-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="setup" className="gap-2">
              <Server className="h-4 w-4" />
              Setup Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Server Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Backend Server</CardTitle>
                  <CardDescription>Real-time server health monitoring</CardDescription>
                </CardHeader>
                <CardContent>
                  <ServerStatus showDetails />
                </CardContent>
              </Card>

              {/* Quick Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Production Features</CardTitle>
                  <CardDescription>Auto-recovery and monitoring</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <span className="text-sm font-medium">Auto Recovery</span>
                        <p className="text-xs text-muted-foreground">Restarts crashed streams automatically</p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <span className="text-sm font-medium">Max Retries</span>
                        <p className="text-xs text-muted-foreground">Attempts before marking failed</p>
                      </div>
                      <Badge variant="outline">3</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <span className="text-sm font-medium">Retry Delay</span>
                        <p className="text-xs text-muted-foreground">Wait time between retries</p>
                      </div>
                      <Badge variant="outline">5 seconds</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <span className="text-sm font-medium">Status Polling</span>
                        <p className="text-xs text-muted-foreground">UI refresh interval</p>
                      </div>
                      <Badge variant="outline">5 seconds</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>
                  Real-time streaming and server logs from the backend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LogViewer maxHeight="500px" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
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
                      Install FFmpeg on your Linux server:
                    </p>
                    <code className="block rounded bg-background p-3 text-sm font-mono">
                      sudo apt update && sudo apt install ffmpeg
                    </code>
                  </div>
                  
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>
                      FFmpeg is used to read video files and output to multiple RTMP destinations simultaneously.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Start */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Start</CardTitle>
                  <CardDescription>One-command installation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Run the installer script on your server:
                    </p>
                    <code className="block rounded bg-background p-3 text-sm font-mono break-all">
                      bash install.sh
                    </code>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">The script will:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Install Node.js 20.x</li>
                      <li>Install FFmpeg</li>
                      <li>Install PM2 for process management</li>
                      <li>Set up Nginx reverse proxy</li>
                      <li>Build and start the application</li>
                    </ul>
                  </div>
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
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/20">
                          <span className="text-2xl font-bold text-primary">1</span>
                        </div>
                        <h4 className="font-semibold">Upload Videos</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Store videos on your server
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/20">
                          <span className="text-2xl font-bold text-primary">2</span>
                        </div>
                        <h4 className="font-semibold">Add Destinations</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Configure RTMP endpoints
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/20">
                          <span className="text-2xl font-bold text-primary">3</span>
                        </div>
                        <h4 className="font-semibold">Create Streams</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Schedule or start immediately
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/20">
                          <span className="text-2xl font-bold text-primary">4</span>
                        </div>
                        <h4 className="font-semibold">Auto Recovery</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Crashed streams auto-restart
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
