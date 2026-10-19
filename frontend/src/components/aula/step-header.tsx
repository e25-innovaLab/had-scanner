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
    <header className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="step">Paso {step}</Pill>
        <Pill tone="role">{actor}</Pill>
        {extra}
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-balance text-primary sm:text-[1.7rem]">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
          {description}
        </p>
      </div>
    </header>
  );
}
