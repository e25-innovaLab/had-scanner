'use client';

import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { CircleHelp, CircleUser, House, Settings } from 'lucide-react';
import { SideNav } from '@/components/shell/side-nav';
import { clearGuestSession } from '@/lib/api/guest-session';
import { HOME_LINKS } from '@/lib/aula';
import { cn } from '@/lib/utils';

const ICONS = {
  '/inicio': House,
  '/ayuda': CircleHelp,
  '/configuracion': Settings,
  '/': CircleUser,
} as const;

export function HomeNav() {
  const { pathname } = useLocation();

  return (
    <SideNav label="Secciones">
      {HOME_LINKS.map((link) => {
        const active = pathname === link.href;
        const Icon = ICONS[link.href];
        const isAccount = link.href === '/';
        return (
          <Link
            key={link.href}
            to={link.href}
            aria-current={active ? 'page' : undefined}
            onClick={isAccount ? () => clearGuestSession() : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap transition-[color,background-color,transform] active:scale-[0.98]',
              active
                ? 'bg-ink font-medium text-sidebar-primary-foreground active:bg-ink/90'
                : 'text-muted-foreground hover:bg-card hover:text-foreground active:bg-muted'
            )}
          >
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
            <span className="flex-1">{link.label}</span>
            {active ? (
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            ) : null}
          </Link>
        );
      })}
    </SideNav>
  );
}
