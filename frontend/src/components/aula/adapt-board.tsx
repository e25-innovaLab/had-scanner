'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Pencil, Sparkles } from 'lucide-react';
import { IntentMeter } from '@/components/aula/intent-meter';
import { MissingAnalysis } from '@/components/aula/missing-analysis';
import { Pill } from '@/components/aula/pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import type { ApiBarrier, BarrierDecision } from '@/lib/api/types';
import { resolveAnalysisId, withAnalysisId } from '@/lib/api/url';
import {
  AI_ATTEMPTS_PER_BARRIER,
  GENERATE_TIMEOUT_MS,
  RESUME_EDIT_TIMEOUT_MS,
} from '@/lib/aula';
import { cn } from '@/lib/utils';

export type AdaptCounts = {
  accepted: number;
  discarded: number;
  pending: number;
  total: number;
};

type Mode = 'empty' | 'generating' | 'ready';

type BarrierState = {
  mode: Mode;
  proposal: string | null;
  decision: BarrierDecision;
  remaining: number;
};

function toState(barrier: ApiBarrier): BarrierState {
  return {
    mode: barrier.hasProposal || barrier.currentProposal ? 'ready' : 'empty',
    proposal: barrier.currentProposal ?? barrier.draft,
    decision: barrier.status,
    remaining: barrier.remainingAttempts,
  };
}

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

export function AdaptBoard({
  onCountsChange,
}: {
  onCountsChange?: (counts: AdaptCounts) => void;
} = {}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const analysisId = resolveAnalysisId(searchParams.get('analysisId'));
  const dimensionFromQuery = searchParams.get('dimension');

  const [barriers, setBarriers] = useState<ApiBarrier[]>([]);
  const [stateById, setStateById] = useState<Record<string, BarrierState>>({});
  const [selectedDimensionId, setSelectedDimensionId] = useState<string>('');
  const [overlay, setOverlay] = useState<{
    entryId: string;
    kind: 'generate' | 'edit';
  } | null>(null);
  const [loading, setLoading] = useState(() => Boolean(analysisId));
  const [error, setError] = useState<string | null>(null);
  const [prevAnalysisId, setPrevAnalysisId] = useState(analysisId);

  if (analysisId !== prevAnalysisId) {
    setPrevAnalysisId(analysisId);
    setLoading(Boolean(analysisId));
  }

  const load = useCallback(async () => {
    if (!analysisId) return;
    const { barriers: list } = await api.listBarriersFlat(analysisId);
    setBarriers(list);
    setStateById(
      Object.fromEntries(list.map((item) => [item.id, toState(item)]))
    );
    // Si venís del detalle, respetá esa dimensión aunque ya esté completa.
    setSelectedDimensionId((current) => {
      if (
        dimensionFromQuery &&
        list.some((b) => b.dimensionId === dimensionFromQuery)
      ) {
        return dimensionFromQuery;
      }
      if (current && list.some((b) => b.dimensionId === current)) return current;
      return list[0]?.dimensionId ?? '';
    });
  }, [analysisId, dimensionFromQuery]);

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    void (async () => {
      try {
        await load();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setOverlay(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysisId, load, pathname]);

  useEffect(() => {
    if (!dimensionFromQuery || barriers.length === 0) return;
    if (barriers.some((b) => b.dimensionId === dimensionFromQuery)) {
      setSelectedDimensionId(dimensionFromQuery);
    }
  }, [dimensionFromQuery, barriers]);

  const dimensions = useMemo(() => {
    const order: string[] = [];
    const map = new Map<
      string,
      { id: string; name: string; items: ApiBarrier[] }
    >();
    for (const barrier of barriers) {
      if (!map.has(barrier.dimensionId)) {
        order.push(barrier.dimensionId);
        map.set(barrier.dimensionId, {
          id: barrier.dimensionId,
          name: barrier.dimension,
          items: [],
        });
      }
      map.get(barrier.dimensionId)!.items.push(barrier);
    }
    return order.map((id) => map.get(id)!);
  }, [barriers]);

  const selectedGroup = useMemo(
    () => dimensions.find((group) => group.id === selectedDimensionId) ?? null,
    [dimensions, selectedDimensionId]
  );

  const overlayEntry = barriers.find((entry) => entry.id === overlay?.entryId);
  const isBusy = Boolean(overlay);

  const counts = useMemo(() => {
    let accepted = 0;
    let discarded = 0;
    let pending = 0;
    for (const barrier of barriers) {
      const state = stateById[barrier.id];
      const decision = state?.decision ?? barrier.status;
      if (decision === 'accepted') accepted += 1;
      else if (decision === 'discarded') discarded += 1;
      else pending += 1;
    }
    return { accepted, discarded, pending, total: barriers.length };
  }, [barriers, stateById]);

  const nextPendingIndex = useMemo(() => {
    const idx = barriers.findIndex((barrier) => {
      const decision = stateById[barrier.id]?.decision ?? barrier.status;
      return decision === 'pending';
    });
    return idx;
  }, [barriers, stateById]);

  useEffect(() => {
    onCountsChange?.(counts);
  }, [counts, onCountsChange]);

  function remainingForGroup(items: ApiBarrier[]) {
    if (items.length === 0) return AI_ATTEMPTS_PER_BARRIER;
    const pending = items.find((item) => {
      const decision = stateById[item.id]?.decision ?? item.status;
      return decision === 'pending';
    });
    const focus = pending ?? items[0];
    return (
      stateById[focus.id]?.remaining ??
      focus.remainingAttempts ??
      AI_ATTEMPTS_PER_BARRIER
    );
  }

  function detalleHref(
    entry: ApiBarrier,
    opts: { origen: string; desde: string; intentos: number }
  ) {
    const i = barriers.findIndex((item) => item.id === entry.id) + 1;
    const n = barriers.length;
    return withAnalysisId(
      `/analisis/detalle?origen=${opts.origen}&desde=${opts.desde}&barrera=${encodeURIComponent(entry.id)}&dimension=${encodeURIComponent(entry.dimensionId)}&intentos=${opts.intentos}&i=${i}&n=${n}`,
      analysisId
    );
  }

  function resumeEdit(entry: ApiBarrier) {
    if (isBusy || !analysisId) return;
    const left = stateById[entry.id]?.remaining ?? entry.remainingAttempts;
    setOverlay({ entryId: entry.id, kind: 'edit' });
    window.setTimeout(() => {
      void api.reopen(analysisId, entry.id).finally(() => {
        navigate(
          detalleHref(entry, {
            origen: 'ia',
            desde: 'editar',
            intentos: left,
          })
        );
      });
    }, RESUME_EDIT_TIMEOUT_MS);
  }

  function generate(entry: ApiBarrier) {
    const left = stateById[entry.id]?.remaining ?? entry.remainingAttempts;
    if (left <= 0 || isBusy || !analysisId) return;

    setOverlay({ entryId: entry.id, kind: 'generate' });
    setStateById((current) => ({
      ...current,
      [entry.id]: { ...current[entry.id], mode: 'generating' },
    }));

    window.setTimeout(() => {
      void (async () => {
        try {
          const { barrier } = await api.createProposal(analysisId, entry.id);
          setStateById((current) => ({
            ...current,
            [entry.id]: {
              ...current[entry.id],
              mode: 'ready',
              remaining: barrier.remainingAttempts,
              proposal: barrier.draft ?? barrier.currentProposal ?? null,
            },
          }));
          navigate(
            detalleHref(entry, {
              origen: 'ia',
              desde: 'generar',
              intentos: barrier.remainingAttempts,
            })
          );
        } catch (err) {
          setOverlay(null);
          setStateById((current) => ({
            ...current,
            [entry.id]: { ...current[entry.id], mode: 'empty' },
          }));
          setError(err instanceof Error ? err.message : 'No se pudo generar');
        }
      })();
    }, GENERATE_TIMEOUT_MS);
  }

  function openBarrier(entry: ApiBarrier) {
    const state = stateById[entry.id] ?? toState(entry);
    if (state.decision === 'accepted' || state.mode === 'ready') {
      resumeEdit(entry);
      return;
    }
    if (state.mode === 'empty') {
      generate(entry);
    }
  }

  if (!analysisId) {
    return <MissingAnalysis step="adaptar barreras" />;
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando adaptaciones...</p>
    );
  }

  const reviewed = counts.accepted + counts.discarded;

  return (
    <div className="relative space-y-4">
      {error ? (
        <p className="text-sm text-danger-foreground" role="alert">
          {error}
        </p>
      ) : null}
      {overlay && overlayEntry ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="space-y-4 py-8 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                {overlay.kind === 'generate' ? (
                  <Sparkles
                    className="size-6 animate-pulse text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <Pencil className="size-6 text-primary" aria-hidden="true" />
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold">
                  {overlay.kind === 'generate'
                    ? 'Generando propuesta con IA'
                    : 'Abriendo edición'}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {overlayEntry.title}
                </p>
              </div>
              <div className="mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    animation: `adapt-generate-progress ${
                      overlay.kind === 'generate'
                        ? GENERATE_TIMEOUT_MS
                        : RESUME_EDIT_TIMEOUT_MS
                    }ms linear forwards`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {overlay.kind === 'generate'
                  ? 'Cuando termine, vas a ver el detalle de la propuesta.'
                  : 'Te llevamos al detalle para seguir ajustando la propuesta.'}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {counts.total > 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {reviewed === 0
            ? `Se detectaron ${counts.total} barreras. Revisalas una a una: pedí una propuesta a la IA, escribí la tuya o descartala.`
            : `Llevás ${reviewed} de ${counts.total} barreras revisadas. Podés seguir donde lo dejaste o abrir cualquier barrera desde la lista.`}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Pendientes', counts.pending],
          ['Aceptadas', counts.accepted],
          ['Editadas', 0],
          ['Descartadas', counts.discarded],
        ].map(([label, value]) => (
          <Card key={String(label)} className="items-center text-center">
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight text-primary">
                {value}
              </p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {counts.total > 0 && counts.pending === 0 ? (
        <Card className="border-success-foreground/20 bg-success-soft/40">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                No quedan barreras pendientes
              </p>
              <p className="text-sm text-muted-foreground">
                Ya podés obtener el material adaptado y el informe.
              </p>
            </div>
            <Button
              className="h-10 px-4 sm:shrink-0"
              nativeButton={false}
              render={
                <Link to={withAnalysisId('/analisis/resultado', analysisId)} />
              }
            >
              Obtener resultado
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Intentos de IA por dimensión</CardTitle>
          <p className="text-xs text-muted-foreground sm:text-right">
            Cada barrera tiene {AI_ATTEMPTS_PER_BARRIER} intentos propios ·
            elegí una dimensión para ver su lista
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))] gap-3">
          {dimensions.map((group) => {
            const active = group.id === selectedDimensionId;
            const value = remainingForGroup(group.items);
            const resolved = group.items.every((item) => {
              const decision = stateById[item.id]?.decision ?? item.status;
              return decision === 'accepted' || decision === 'discarded';
            });
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={active}
                aria-label={
                  resolved
                    ? `${group.name}, dimensión revisada`
                    : group.name
                }
                onClick={() => {
                  setSelectedDimensionId(group.id);
                  const params = new URLSearchParams(searchParams);
                  params.set('dimension', group.id);
                  navigate(
                    { pathname, search: params.toString() },
                    { replace: true }
                  );
                }}
                className={cn(
                  'relative min-w-0 space-y-2 rounded-xl px-3 py-3 text-left ring-1 transition-[transform,box-shadow,background-color,ring-color]',
                  active
                    ? 'scale-[1.04] bg-info py-4 text-info-foreground ring-2 ring-primary/40 shadow-sm'
                    : resolved
                      ? 'bg-success-soft/50 ring-success-foreground/25 hover:bg-success-soft/70'
                      : 'bg-secondary/60 ring-border hover:bg-secondary hover:ring-primary/20'
                )}
              >
                {resolved ? (
                  <span
                    className={cn(
                      'absolute top-2 right-2 flex size-5 items-center justify-center rounded-full',
                      active
                        ? 'bg-card text-success-foreground'
                        : 'bg-success-soft text-success-foreground'
                    )}
                    title="Dimensión revisada"
                  >
                    <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                  </span>
                ) : null}
                <p className="pr-6 text-xs leading-4 font-medium wrap-break-word">
                  {group.name}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <IntentMeter
                    remaining={value}
                    total={AI_ATTEMPTS_PER_BARRIER}
                  />
                  <span
                    className={cn(
                      'text-xs',
                      active
                        ? 'text-info-foreground/80'
                        : 'text-muted-foreground'
                    )}
                  >
                    {value} de {AI_ATTEMPTS_PER_BARRIER}
                  </span>
                </div>
                <p
                  className={cn(
                    'text-[11px]',
                    active
                      ? 'text-info-foreground/70'
                      : resolved
                        ? 'text-success-foreground'
                        : 'text-muted-foreground'
                  )}
                >
                  {resolved
                    ? 'Revisada'
                    : `${group.items.length} ${group.items.length === 1 ? 'barrera' : 'barreras'}`}
                </p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {selectedGroup ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-primary">
              {selectedGroup.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectedGroup.items.length}{' '}
              {selectedGroup.items.length === 1 ? 'barrera' : 'barreras'} en esta
              dimensión
            </p>
          </div>

          {selectedGroup.items.map((entry) => {
            const globalIndex = barriers.findIndex((b) => b.id === entry.id);
            const state = stateById[entry.id] ?? toState(entry);
            const left = state.remaining;
            const isNext = globalIndex === nextPendingIndex;
            const decision = state.decision;
            const statusLabel =
              decision === 'accepted'
                ? 'Aceptada'
                : decision === 'discarded'
                  ? 'Descartada'
                  : isNext
                    ? 'Próxima'
                    : 'Pendiente';
            const actionLabel =
              decision === 'accepted' || state.mode === 'ready'
                ? 'Ver o cambiar'
                : 'Revisar';

            return (
              <Card
                key={entry.id}
                className={cn(
                  'flex-row flex-wrap items-center gap-3 px-(--card-spacing) py-3 sm:flex-nowrap',
                  isNext && 'ring-2 ring-primary/35'
                )}
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground"
                  aria-hidden="true"
                >
                  {globalIndex + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="role">{entry.dimension}</Pill>
                    <Pill tone={priorityTone[entry.severity]}>
                      {priorityLabel[entry.severity]}
                    </Pill>
                  </div>
                  <p className="text-sm font-semibold text-balance">
                    {entry.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dónde: {entry.where}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Intentos IA: {left} de {AI_ATTEMPTS_PER_BARRIER}
                  </p>
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      decision === 'accepted' && 'text-success-foreground',
                      decision === 'discarded' && 'text-muted-foreground',
                      decision === 'pending' &&
                        isNext &&
                        'text-primary',
                      decision === 'pending' &&
                        !isNext &&
                        'text-muted-foreground'
                    )}
                  >
                    {decision === 'accepted'
                      ? '✓ '
                      : decision === 'discarded'
                        ? '– '
                        : isNext
                          ? '→ '
                          : '○ '}
                    {statusLabel}
                  </span>
                  <Button
                    type="button"
                    variant={isNext ? 'default' : 'outline'}
                    className="h-9 px-3"
                    disabled={isBusy || state.mode === 'generating'}
                    onClick={() => openBarrier(entry)}
                  >
                    {state.mode === 'generating' ? 'Generando…' : actionLabel}
                  </Button>
                </div>
              </Card>
            );
          })}

          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Revisar</span> genera
            una propuesta con IA (1 intento) y abre el detalle.{' '}
            <span className="font-medium text-foreground">Ver o cambiar</span>{' '}
            retoma una propuesta ya aceptada o generada.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay dimensiones con barreras para mostrar.
        </p>
      )}
    </div>
  );
}
