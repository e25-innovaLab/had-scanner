import { Outlet } from 'react-router-dom';
import { FlowResumeTracker } from '@/components/aula/flow-resume-tracker';
import { FlowNav } from '@/components/shell/flow-nav';

export function AnalisisLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <FlowNav />
      <FlowResumeTracker />
      <main className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-6 px-6 pt-[40px] pb-[96px] md:px-[48px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
