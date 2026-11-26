import { useLocation } from 'react-router-dom';
import { VeraLogo } from '@/components/shell/vera-logo';

export function AppHeader() {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '/acceso') return null;

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(226,232,240,0.75)] bg-white backdrop-blur-[10px]">
      <div className="flex h-14 items-center px-4 sm:px-6">
        <VeraLogo to="/inicio" />
      </div>
    </header>
  );
}
