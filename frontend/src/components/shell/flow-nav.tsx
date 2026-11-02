'use client';

import { Link } from 'react-router-dom';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { SideNav } from '@/components/shell/side-nav';
import { resolveAnalysisId, withAnalysisId } from '@/lib/api/url';
import {
  readVeraSource,
  VERA_SOURCE,
  veraSourceLabel,
} from '@/lib/api/vera-source';
import { FLOW_STEPS } from '@/lib/aula';
import { cn } from '@/lib/utils';

export function FlowNav() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const analysisId = resolveAnalysisId(searchParams.get('analysisId'));
  const veraSource = readVeraSource() ?? VERA_SOURCE.mock;
  const isDetalle = pathname.startsWith('/analisis/detalle');
  const flowPath = isDetalle ? '/analisis/adaptar' : pathname;
  const currentIndex = Math.max(
    0,
    FLOW_STEPS.findIndex(
      (step) => flowPath === step.href || flowPath.startsWith(`${step.href}/`)
    )
  );
  const barrierIndex = Number(searchParams.get('i') ?? '');
  const barrierTotal = Number(searchParams.get('n') ?? '');
  const dimensionFromDetalle = searchParams.get('dimension');
  const showBarrierSub =
    isDetalle &&
    Number.isFinite(barrierIndex) &&
    barrierIndex > 0 &&
    Number.isFinite(barrierTotal) &&
    barrierTotal > 0;

  function stepHref(href: string) {
    if (
      isDetalle &&
      href === '/analisis/adaptar' &&
      dimensionFromDetalle
    ) {
      return withAnalysisId(
        `/analisis/adaptar?dimension=${encodeURIComponent(dimensionFromDetalle)}`,
        analysisId
      );
    }
    return withAnalysisId(href, analysisId);
  }

  return (
    <SideNav label="Pasos del análisis">
      {FLOW_STEPS.map((step, index) => {
        const state =
          index < currentIndex
            ? 'done'
            : index === currentIndex
              ? 'current'
              : 'upcoming';
        const number = String(index + 1).padStart(2, '0');
        const isAdaptar = step.href === '/analisis/adaptar';
        return (
          <div key={step.href} className="space-y-1">
            <Link
              to={stepHref(step.href)}
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap transition-colors',
                state === 'current'
                  ? 'bg-ink font-medium text-sidebar-primary-foreground'
                  : state === 'done'
                    ? 'text-foreground hover:bg-card'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
              )}
            >
              {state === 'done' ? (
                <Check
                  className="size-4 text-success-foreground"
                  aria-hidden="true"
                />
              ) : (
                <span className="w-5 text-xs tabular-nums opacity-80">
                  {number}
                </span>
              )}
              <span className="flex-1">{step.label}</span>
              {state === 'current' ? (
                <span
                  className="size-1.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
              ) : null}
            </Link>
            {isAdaptar && state === 'current' && showBarrierSub ? (
              <p className="space-y-0.5 pl-10 text-xs leading-4 text-muted-foreground">
                <span className="block font-medium text-foreground/80">
                  Detalle y edición
                </span>
                Barrera {barrierIndex} de {barrierTotal}
              </p>
            ) : null}
          </div>
        );
      })}
      <p className="mt-3 hidden px-3 text-[11px] leading-4 text-muted-foreground md:block">
        Origen: {veraSourceLabel(veraSource)}
      </p>
    </SideNav>
  );
}
