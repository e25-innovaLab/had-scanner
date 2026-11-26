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
      className="flex gap-1 overflow-x-auto border-b border-[rgba(226,232,240,0.75)] bg-white px-3 py-2 backdrop-blur-[10px] md:w-[288px] md:shrink-0 md:flex-col md:items-start md:self-stretch md:gap-1 md:overflow-visible md:border-r md:border-b-0 md:px-3 md:py-5"
    >
      {children}
    </nav>
  );
}
