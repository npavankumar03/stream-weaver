import { MainLayout } from '@/components/layout/MainLayout';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { RecentStreams } from '@/components/dashboard/RecentStreams';
import { DestinationsList } from '@/components/dashboard/DestinationsList';
import { useStreams } from '@/hooks/useStreams';
import { useVideos } from '@/hooks/useVideos';
import { useDestinations } from '@/hooks/useDestinations';
import { Radio, Video, Tv2, CalendarClock } from 'lucide-react';

export default function Dashboard() {
  const { data: streams = [] } = useStreams();
  const { data: videos = [] } = useVideos();
  const { data: destinations = [] } = useDestinations();

  const liveStreams = streams.filter((s) => s.status === 'live').length;
  const scheduledStreams = streams.filter((s) => s.status === 'scheduled').length;
  const completedStreams = streams.filter((s) => s.status === 'completed').length;

  return (
    <MainLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your multi-stream broadcasts from one place
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            title="Live Now"
            value={liveStreams}
            icon={Radio}
            variant="live"
            trend={liveStreams > 0 ? 'Broadcasting' : 'No active streams'}
          />
          <StatusCard
            title="Scheduled"
            value={scheduledStreams}
            icon={CalendarClock}
            variant="scheduled"
            trend="Upcoming streams"
          />
          <StatusCard
            title="Videos"
            value={videos.length}
            icon={Video}
            variant="default"
            trend="In library"
          />
          <StatusCard
            title="Destinations"
            value={destinations.filter((d) => d.is_active).length}
            icon={Tv2}
            variant="success"
            trend="Active platforms"
          />
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentStreams streams={streams} />
          <DestinationsList destinations={destinations} />
        </div>
      </div>
    </MainLayout>
  );
}
