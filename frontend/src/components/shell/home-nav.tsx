'use client';

import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { SideNav } from '@/components/shell/side-nav';
import { HOME_LINKS } from '@/lib/aula';
import { cn } from '@/lib/utils';

export function HomeNav() {
  const { pathname } = useLocation();

  return (
    <SideNav label="Secciones">
      {HOME_LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            to={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors',
              active
                ? 'bg-info font-medium text-info-foreground'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </SideNav>
  );
}
