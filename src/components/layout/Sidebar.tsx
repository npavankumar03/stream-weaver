import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Video, 
  Tv2, 
  CalendarClock, 
  Radio,
  Settings
} from 'lucide-react';
import { ServerStatus } from '@/components/system/ServerStatus';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/videos', icon: Video, label: 'Video Library' },
  { path: '/destinations', icon: Tv2, label: 'Destinations' },
  { path: '/streams', icon: Radio, label: 'Streams' },
  { path: '/schedule', icon: CalendarClock, label: 'Schedule' },
];

export function Sidebar() {
  const location = useLocation();
  
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Radio className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">StreamFlow</h1>
          <p className="text-xs text-muted-foreground">Multi-Stream Manager</p>
        </div>
        <ServerStatus />
      </div>
      
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      
      <div className="absolute bottom-4 left-4 right-4">
        <NavLink
          to="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
            location.pathname === '/settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
