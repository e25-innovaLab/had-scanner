'use client';

import { Link } from 'react-router-dom';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Pill } from '@/components/aula/pill';
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
      <div className="mb-1 px-3 md:mb-2">
        <Pill tone="outline">{veraSourceLabel(veraSource)}</Pill>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          Fijo para este recorrido
        </p>
      </div>
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
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors',
                state === 'current'
                  ? 'bg-info font-medium text-info-foreground'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground'
              )}
            >
              {state === 'done' ? (
                <Check
                  className="size-4 text-success-foreground"
                  aria-hidden="true"
                />
              ) : (
                <span className="w-5 text-xs tabular-nums">{number}</span>
              )}
              {step.label}
            </Link>
            {isAdaptar && state === 'current' && showBarrierSub ? (
              <p className="pl-10 text-xs text-muted-foreground">
                Barrera {barrierIndex} de {barrierTotal}
              </p>
            ) : null}
          </div>
        );
      })}
    </SideNav>
  );
}
