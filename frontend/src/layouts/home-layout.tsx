import { Outlet } from 'react-router-dom';
import { HomeNav } from '@/components/shell/home-nav';

export function HomeLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <HomeNav />
      <main className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-8 px-6 pt-[40px] pb-[96px] md:px-[48px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
