import { Outlet } from 'react-router-dom';
import { FlowResumeTracker } from '@/components/aula/flow-resume-tracker';
import { FlowNav } from '@/components/shell/flow-nav';

export function AnalisisLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <FlowNav />
      <FlowResumeTracker />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
}
