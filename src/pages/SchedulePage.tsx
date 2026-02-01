import { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useStreams } from '@/hooks/useStreams';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay, parseISO } from 'date-fns';
import { CalendarClock, Radio, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function SchedulePage() {
  const { data: streams = [] } = useStreams();

  const scheduledStreams = useMemo(() => {
    return streams.filter((s) => s.scheduled_at && ['scheduled', 'pending'].includes(s.status));
  }, [streams]);

  const scheduledDates = useMemo(() => {
    return scheduledStreams
      .map((s) => s.scheduled_at ? parseISO(s.scheduled_at) : null)
      .filter(Boolean) as Date[];
  }, [scheduledStreams]);

  const upcomingStreams = useMemo(() => {
    return scheduledStreams
      .filter((s) => s.scheduled_at && new Date(s.scheduled_at) > new Date())
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
      .slice(0, 5);
  }, [scheduledStreams]);

  return (
    <MainLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Schedule</h1>
          <p className="mt-1 text-muted-foreground">
            View and manage your scheduled streams
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Calendar */}
          <div className="rounded-xl border border-border bg-card p-6">
            <Calendar
              mode="multiple"
              selected={scheduledDates}
              className="w-full"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4 w-full",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-lg font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                  "h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex justify-between",
                head_cell: "text-muted-foreground rounded-md w-12 font-normal text-[0.8rem]",
                row: "flex w-full mt-2 justify-between",
                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                day: cn(
                  "h-12 w-12 p-0 font-normal rounded-lg",
                  "hover:bg-muted hover:text-foreground",
                  "focus:bg-primary focus:text-primary-foreground"
                ),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
              }}
              modifiers={{
                scheduled: scheduledDates,
              }}
              modifiersStyles={{
                scheduled: {
                  backgroundColor: 'hsl(var(--scheduled) / 0.2)',
                  color: 'hsl(var(--scheduled))',
                  fontWeight: 'bold',
                },
              }}
            />
          </div>

          {/* Upcoming Streams */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <CalendarClock className="h-5 w-5 text-primary" />
                Upcoming Streams
              </h3>
            </div>
            
            <div className="divide-y divide-border">
              {upcomingStreams.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No scheduled streams
                </div>
              ) : (
                upcomingStreams.map((stream) => (
                  <div key={stream.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{stream.title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {stream.destinations?.length || 0} destinations
                        </p>
                      </div>
                      <Badge variant="outline" className="text-scheduled border-scheduled">
                        <Clock className="mr-1 h-3 w-3" />
                        Scheduled
                      </Badge>
                    </div>
                    {stream.scheduled_at && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {format(new Date(stream.scheduled_at), 'EEEE, MMMM d, yyyy')}
                        </span>
                        <span className="text-primary font-medium">
                          {format(new Date(stream.scheduled_at), 'h:mm a')}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
