import type { ReactNode } from 'react';

export function SideNav({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className="flex gap-1 overflow-x-auto border-b border-sidebar-border bg-sidebar px-3 py-2 md:w-60 md:shrink-0 md:flex-col md:gap-1 md:overflow-visible md:border-r md:border-b-0 md:px-3 md:py-5"
    >
      {children}
    </nav>
  );
}
