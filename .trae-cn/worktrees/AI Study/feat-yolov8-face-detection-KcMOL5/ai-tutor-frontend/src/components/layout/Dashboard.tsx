import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import StudyMonitor from '@/components/monitor/StudyMonitor';

export default function Dashboard() {
  return (
    <div className="mesh-bg flex h-[100dvh] bg-slate-50">
      {/* Left sidebar — glass panel */}
      <aside className="w-64 shrink-0 border-r border-slate-200/50 bg-white/80 backdrop-blur-xl flex flex-col">
        <Sidebar />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex min-w-0">
        <main className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </main>

        {/* Right: Study monitor panel — glass panel */}
        <aside className="w-80 shrink-0 border-l border-slate-200/50 bg-white/40 backdrop-blur-sm overflow-y-auto scrollbar-thin">
          <StudyMonitor />
        </aside>
      </div>
    </div>
  );
}