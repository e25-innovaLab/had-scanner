'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { MissingAnalysis } from '@/components/aula/missing-analysis';
import { Pill } from '@/components/aula/pill';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import type { BarrierGroupDto, BarriersResponse } from '@/lib/api/types';
import { resolveAnalysisId } from '@/lib/api/url';
import { cn } from '@/lib/utils';

const priorityTone = {
  alta: 'alta',
  media: 'media',
  baja: 'baja',
} as const;

const priorityLabel = {
  alta: 'Prioridad alta',
  media: 'Prioridad media',
  baja: 'Prioridad baja',
} as const;

export type BarrierStats = BarriersResponse['stats'];

export function BarrierList({
  onStats,
}: {
  onStats?: (stats: BarrierStats) => void;
} = {}) {
  const [searchParams] = useSearchParams();
  const analysisId = resolveAnalysisId(searchParams.get('analysisId'));
  const [groups, setGroups] = useState<BarrierGroupDto[]>([]);
  const [openId, setOpenId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => Boolean(analysisId));
  const [prevAnalysisId, setPrevAnalysisId] = useState(analysisId);

  if (analysisId !== prevAnalysisId) {
    setPrevAnalysisId(analysisId);
    setLoading(Boolean(analysisId));
  }

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.getBarriersForUi(analysisId);
        if (cancelled) return;
        setGroups(data.groups);
        onStats?.(data.stats);
        const firstWithItems = data.groups.find((g) => g.items.length > 0);
        setOpenId(firstWithItems?.id ?? data.groups[0]?.id ?? '');
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Error al cargar barreras'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysisId, onStats]);

  if (!analysisId) {
    return <MissingAnalysis step="revisar barreras" />;
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando barreras...</p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-danger-foreground" role="alert">
        {error}
      </p>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      {groups.map((group) => {
        const open = openId === group.id;
        const hasBarriers = group.items.length > 0;
        return (
          <section
            key={group.id}
            className="border-b border-border last:border-b-0"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40"
              aria-expanded={open}
              onClick={() => setOpenId(open ? '' : group.id)}
            >
              <ChevronDown
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform',
                  open && 'rotate-180'
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 text-sm font-medium">
                {group.name}
              </span>
              {hasBarriers ? (
                <Pill tone="role">
                  {group.items.length}{' '}
                  {group.items.length === 1 ? 'barrera' : 'barreras'}
                </Pill>
              ) : (
                <Pill tone="ok">Sin barreras</Pill>
              )}
            </button>
            {open ? <BarrierBody group={group} /> : null}
          </section>
        );
      })}
    </Card>
  );
}

function BarrierBody({ group }: { group: BarrierGroupDto }) {
  if (group.items.length === 0) {
    return (
      <div className="px-4 pb-4 text-sm text-muted-foreground">
        No se detectaron barreras en esta dimensión.
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-4">
      {group.items.map((item) => (
        <article
          key={item.id}
          className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-none"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 text-sm font-semibold text-balance">
              {item.title}
            </h3>
            <Pill tone={priorityTone[item.severity]}>
              {priorityLabel[item.severity]}
            </Pill>
          </div>
          <p className="text-sm leading-6">
            <span className="font-medium text-muted-foreground">
              ¿Por qué es barrera?{' '}
            </span>
            {item.why}
          </p>
          <p className="text-sm leading-6">
            <span className="font-medium text-muted-foreground">
              Dónde está:{' '}
            </span>
            {item.where}
          </p>
          <p className="text-sm leading-6">
            <span className="font-medium text-muted-foreground">
              Recomendación:{' '}
            </span>
            {item.recommendation}
          </p>
        </article>
      ))}
    </div>
  );
}
