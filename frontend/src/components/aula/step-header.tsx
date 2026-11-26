import type { ReactNode } from 'react';
import { Pill } from '@/components/aula/pill';

export function StepHeader({
  step,
  actor,
  title,
  description,
  extra,
}: {
  step: string;
  actor: string;
  title: string;
  description: string;
  extra?: ReactNode;
}) {
  return (
    <header className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="step">Paso {step}</Pill>
        <Pill tone="role">{actor}</Pill>
        {extra}
      </div>
      <div className="space-y-1.5">
        <h1 className="font-heading text-[32px] leading-normal font-bold text-[#0F172A]">
          {title}
        </h1>
        <p className="max-w-3xl text-[14px] leading-normal font-medium text-muted-foreground">
          {description}
        </p>
      </div>
    </header>
  );
}
