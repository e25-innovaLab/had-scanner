import { useLocation } from 'react-router-dom';
import { VeraLogo } from '@/components/shell/vera-logo';

export function AppHeader() {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '/acceso') return null;

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-sm">
      <div className="flex h-14 items-center px-4 sm:px-6">
        <VeraLogo to="/inicio" />
      </div>
    </header>
  );
}
