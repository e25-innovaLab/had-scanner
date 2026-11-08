"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Check, Pencil, Sparkles } from "lucide-react";
import { IntentMeter } from "@/components/aula/intent-meter";
import { MissingAnalysis } from "@/components/aula/missing-analysis";
import { Pill } from "@/components/aula/pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { isBackendId } from "@/lib/api/ids";
import {
  PROPOSAL_JOB_STATUS,
  clearProposalJob,
  startProposal,
  useProposalJobs,
} from "@/lib/api/proposal-jobs";
import type { ApiBarrier, BarrierDecision } from "@/lib/api/types";
import { resolveAnalysisId, withAnalysisId } from "@/lib/api/url";
import { AI_ATTEMPTS_PER_BARRIER, RESUME_EDIT_TIMEOUT_MS } from "@/lib/aula";
import { cn } from "@/lib/utils";

export type AdaptCounts = {
  accepted: number;
  discarded: number;
  pending: number;
  total: number;
  nextPending: {
    id: string;
    dimensionId: string;
    index: number;
  } | null;
};

type Mode = "empty" | "generating" | "ready";

type BarrierState = {
  mode: Mode;
  proposal: string | null;
  decision: BarrierDecision;
  remaining: number;
  generateFail: string | null;
};

type OverlayState = {
  entryId: string;
  kind: "edit" | "generate-error";
  message?: string;
};

function toState(barrier: ApiBarrier): BarrierState {
  return {
    mode: barrier.hasProposal || barrier.currentProposal ? "ready" : "empty",
    proposal: barrier.currentProposal ?? barrier.draft,
    decision: barrier.status,
    remaining: barrier.remainingAttempts,
    generateFail: null,
  };
}

const priorityTone = {
  alta: "alta",
  media: "media",
  baja: "baja",
} as const;

const priorityLabel = {
  alta: "Prioridad alta",
  media: "Prioridad media",
  baja: "Prioridad baja",
} as const;

export function AdaptBoard({
  onCountsChange,
}: {
  onCountsChange?: (counts: AdaptCounts) => void;
} = {}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const analysisId = resolveAnalysisId(searchParams.get("analysisId"));
  const usesBackendApi = Boolean(analysisId && isBackendId(analysisId));
  const dimensionFromQuery = searchParams.get("dimension");

  const [barriers, setBarriers] = useState<ApiBarrier[]>([]);
  const [stateById, setStateById] = useState<Record<string, BarrierState>>({});
  const [selectedDimensionId, setSelectedDimensionId] = useState<string>("");
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [loading, setLoading] = useState(() => Boolean(analysisId));
  const [error, setError] = useState<string | null>(null);
  const [prevAnalysisId, setPrevAnalysisId] = useState(analysisId);
  const proposalJobs = useProposalJobs();

  if (analysisId !== prevAnalysisId) {
    setPrevAnalysisId(analysisId);
    setLoading(Boolean(analysisId));
  }

  const load = useCallback(async () => {
    if (!analysisId) return;
    const { barriers: list } = await api.getBarriersFlatForUi(analysisId);
    setBarriers(list);
    setStateById(
      Object.fromEntries(list.map((item) => [item.id, toState(item)])),
    );
    // Si venís del detalle, respetá esa dimensión aunque ya esté completa.
    setSelectedDimensionId((current) => {
      if (
        dimensionFromQuery &&
        list.some((b) => b.dimensionId === dimensionFromQuery)
      ) {
        return dimensionFromQuery;
      }
      if (current && list.some((b) => b.dimensionId === current))
        return current;
      return list[0]?.dimensionId ?? "";
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
          setError(err instanceof Error ? err.message : "Error al cargar");
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
    [dimensions, selectedDimensionId],
  );

  const isOpeningEdit = overlay?.kind === "edit";

  const displayStateById = useMemo(() => {
    if (!analysisId) return stateById;
    const patches: Record<string, BarrierState> = {};
    for (const job of proposalJobs) {
      if (job.analysisId !== analysisId) continue;
      const previous =
        patches[job.barrierId] ??
        stateById[job.barrierId] ??
        (job.barrier ? toState(job.barrier) : null);

      if (job.status === PROPOSAL_JOB_STATUS.PENDING) {
        if (!previous || previous.mode === "generating") continue;
        patches[job.barrierId] = {
          ...previous,
          mode: "generating",
          generateFail: null,
        };
        continue;
      }

      if (job.status === PROPOSAL_JOB_STATUS.SUCCESS && job.barrier) {
        patches[job.barrierId] = {
          ...(previous ?? toState(job.barrier)),
          mode: "ready",
          remaining: job.barrier.remainingAttempts,
          proposal: job.barrier.draft ?? job.barrier.currentProposal ?? null,
          generateFail: null,
        };
        continue;
      }

      if (job.status === PROPOSAL_JOB_STATUS.ERROR) {
        const message = job.error ?? "La IA no pudo completar la solicitud.";
        patches[job.barrierId] = {
          ...(previous ?? {
            mode: "empty",
            proposal: null,
            decision: "pending",
            remaining: AI_ATTEMPTS_PER_BARRIER,
            generateFail: null,
          }),
          mode: "empty",
          generateFail: message,
        };
      }
    }
    if (Object.keys(patches).length === 0) return stateById;
    return { ...stateById, ...patches };
  }, [analysisId, proposalJobs, stateById]);

  const jobError = useMemo(() => {
    if (!analysisId) return null;
    return (
      proposalJobs.find(
        (job) =>
          job.analysisId === analysisId &&
          job.status === PROPOSAL_JOB_STATUS.ERROR,
      ) ?? null
    );
  }, [analysisId, proposalJobs]);

  const activeOverlay: OverlayState | null =
    overlay ??
    (jobError
      ? {
          entryId: jobError.barrierId,
          kind: "generate-error",
          message: jobError.error ?? "La IA no pudo completar la solicitud.",
        }
      : null);

  const overlayEntry = barriers.find(
    (entry) => entry.id === activeOverlay?.entryId,
  );
  const displayError =
    error ??
    (jobError
      ? (jobError.error ?? "La IA no pudo completar la solicitud.")
      : null);

  useEffect(() => {
    if (!analysisId || loading) return;

    for (const job of proposalJobs) {
      if (job.analysisId !== analysisId) continue;
      if (job.status !== PROPOSAL_JOB_STATUS.SUCCESS || !job.barrier) {
        continue;
      }

      const barrier = job.barrier;
      const i = barriers.findIndex((item) => item.id === barrier.id) + 1;
      const n = barriers.length;
      clearProposalJob(job.analysisId, job.barrierId);
      navigate(
        withAnalysisId(
          `/analisis/detalle?origen=ia&desde=generar&barrera=${encodeURIComponent(barrier.id)}&dimension=${encodeURIComponent(barrier.dimensionId)}&intentos=${barrier.remainingAttempts}&i=${i > 0 ? i : 1}&n=${n > 0 ? n : 1}`,
          analysisId,
        ),
      );
    }
  }, [analysisId, proposalJobs, navigate, loading, barriers]);

  const nextPendingIndex = useMemo(() => {
    return barriers.findIndex((barrier) => {
      const decision = displayStateById[barrier.id]?.decision ?? barrier.status;
      return decision === "pending";
    });
  }, [barriers, displayStateById]);

  const counts = useMemo(() => {
    let accepted = 0;
    let discarded = 0;
    let pending = 0;
    for (const barrier of barriers) {
      const state = displayStateById[barrier.id];
      const decision = state?.decision ?? barrier.status;
      if (decision === "accepted") accepted += 1;
      else if (decision === "discarded") discarded += 1;
      else pending += 1;
    }
    const next = nextPendingIndex >= 0 ? barriers[nextPendingIndex] : undefined;
    return {
      accepted,
      discarded,
      pending,
      total: barriers.length,
      nextPending: next
        ? {
            id: next.id,
            dimensionId: next.dimensionId,
            index: nextPendingIndex + 1,
          }
        : null,
    };
  }, [barriers, displayStateById, nextPendingIndex]);

  useEffect(() => {
    onCountsChange?.(counts);
  }, [counts, onCountsChange]);

  function remainingForGroup(items: ApiBarrier[]) {
    if (items.length === 0) return AI_ATTEMPTS_PER_BARRIER;
    const pending = items.find((item) => {
      const decision = displayStateById[item.id]?.decision ?? item.status;
      return decision === "pending";
    });
    const focus = pending ?? items[0];
    return (
      displayStateById[focus.id]?.remaining ??
      focus.remainingAttempts ??
      AI_ATTEMPTS_PER_BARRIER
    );
  }

  function detalleHref(
    entry: ApiBarrier,
    opts: { origen: string; desde: string; intentos: number },
  ) {
    const i = barriers.findIndex((item) => item.id === entry.id) + 1;
    const n = barriers.length;
    return withAnalysisId(
      `/analisis/detalle?origen=${opts.origen}&desde=${opts.desde}&barrera=${encodeURIComponent(entry.id)}&dimension=${encodeURIComponent(entry.dimensionId)}&intentos=${opts.intentos}&i=${i}&n=${n}`,
      analysisId,
    );
  }

  function resumeEdit(entry: ApiBarrier) {
    if (isOpeningEdit || !analysisId) return;
    if (displayStateById[entry.id]?.mode === "generating") return;
    const left =
      displayStateById[entry.id]?.remaining ?? entry.remainingAttempts;
    setOverlay({ entryId: entry.id, kind: "edit" });
    if (usesBackendApi) {
      navigate(
        detalleHref(entry, {
          origen: "ia",
          desde: "editar",
          intentos: left,
        }),
      );
      return;
    }
    window.setTimeout(() => {
      void api.reopen(analysisId, entry.id).finally(() => {
        navigate(
          detalleHref(entry, {
            origen: "ia",
            desde: "editar",
            intentos: left,
          }),
        );
      });
    }, RESUME_EDIT_TIMEOUT_MS);
  }

  function generate(entry: ApiBarrier) {
    const left =
      displayStateById[entry.id]?.remaining ?? entry.remainingAttempts;
    if (left <= 0 || isOpeningEdit || !analysisId) return;
    if (displayStateById[entry.id]?.mode === "generating") return;

    setError(null);
    setOverlay(null);
    setStateById((current) => ({
      ...current,
      [entry.id]: {
        ...current[entry.id],
        mode: "generating",
        generateFail: null,
      },
    }));
    startProposal(analysisId, entry.id, {
      barrierTitle: entry.title,
      dimensionId: entry.dimensionId,
    });
  }

  function dismissGenerateError() {
    if (jobError) {
      clearProposalJob(jobError.analysisId, jobError.barrierId);
    }
    setOverlay(null);
    setError(null);
  }

  function openBarrier(entry: ApiBarrier) {
    const state = displayStateById[entry.id] ?? toState(entry);
    if (state.decision === "accepted" || state.mode === "ready") {
      resumeEdit(entry);
      return;
    }
    if (state.mode === "empty") {
      openReview(entry);
    }
  }

  function openReview(entry: ApiBarrier) {
    if (isOpeningEdit || !analysisId) return;
    if (displayStateById[entry.id]?.mode === "generating") return;
    const left =
      displayStateById[entry.id]?.remaining ?? entry.remainingAttempts;
    navigate(
      detalleHref(entry, {
        origen: "ia",
        desde: "revisar",
        intentos: left,
      }),
    );
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
      {displayError ? (
        <p className="text-sm text-danger-foreground" role="alert">
          {displayError}
        </p>
      ) : null}
      {activeOverlay && overlayEntry ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4"
          role={
            activeOverlay.kind === "generate-error" ? "alertdialog" : "status"
          }
          aria-live="assertive"
          aria-busy={activeOverlay.kind === "edit"}
          aria-labelledby="adapt-overlay-title"
          aria-describedby="adapt-overlay-desc"
        >
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="space-y-4 py-8 text-center">
              <div
                className={cn(
                  "mx-auto flex size-12 items-center justify-center rounded-full",
                  activeOverlay.kind === "generate-error"
                    ? "bg-danger-soft"
                    : "bg-primary/10",
                )}
              >
                {activeOverlay.kind === "generate-error" ? (
                  <AlertCircle
                    className="size-6 text-danger-foreground"
                    aria-hidden="true"
                  />
                ) : (
                  <Pencil className="size-6 text-primary" aria-hidden="true" />
                )}
              </div>
              <div className="space-y-1.5">
                <p id="adapt-overlay-title" className="text-base font-semibold">
                  {activeOverlay.kind === "generate-error"
                    ? "No se pudo generar la propuesta"
                    : "Abriendo edición"}
                </p>
                <p
                  id="adapt-overlay-desc"
                  className="text-sm leading-6 text-muted-foreground"
                >
                  {activeOverlay.kind === "generate-error"
                    ? (activeOverlay.message ??
                      "La IA no pudo completar la solicitud.")
                    : overlayEntry.title}
                </p>
              </div>
              {activeOverlay.kind === "generate-error" ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    className="h-9 rounded-xl px-4"
                    onClick={() => generate(overlayEntry)}
                  >
                    Reintentar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl px-4"
                    onClick={dismissGenerateError}
                  >
                    Cerrar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        animation: `adapt-generate-progress ${RESUME_EDIT_TIMEOUT_MS}ms linear forwards`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Te llevamos al detalle para seguir ajustando la propuesta.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {counts.total > 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {reviewed === 0
            ? `Se detectaron ${counts.total} barreras. Revisalas una a una en el detalle: generá con IA, escribí la tuya o descartala.`
            : `Llevás ${reviewed} de ${counts.total} barreras revisadas. Podés seguir donde lo dejaste o abrir cualquier barrera desde la lista.`}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Pendientes", counts.pending],
          ["Aceptadas", counts.accepted],
          ["Editadas", 0],
          ["Descartadas", counts.discarded],
        ].map(([label, value]) => (
          <Card
            key={String(label)}
            className="items-center text-center shadow-sm ring-1 ring-border/70"
          >
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {value}
              </p>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
              </p>
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
                <Link to={withAnalysisId("/analisis/resultado", analysisId)} />
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
              const decision =
                displayStateById[item.id]?.decision ?? item.status;
              return decision === "accepted" || decision === "discarded";
            });
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={active}
                aria-label={
                  resolved ? `${group.name}, dimensión revisada` : group.name
                }
                onClick={() => {
                  setSelectedDimensionId(group.id);
                  const params = new URLSearchParams(searchParams);
                  params.set("dimension", group.id);
                  navigate(
                    { pathname, search: params.toString() },
                    { replace: true },
                  );
                }}
                className={cn(
                  "relative min-w-0 space-y-2 rounded-xl px-3 py-3 text-left ring-1 transition-[transform,box-shadow,background-color,ring-color]",
                  active
                    ? "scale-[1.02] bg-card py-4 text-foreground shadow-sm ring-2 ring-ink"
                    : resolved
                      ? "bg-success-soft/50 ring-success-foreground/25 hover:bg-success-soft/70 active:bg-success-soft"
                      : "bg-card ring-border hover:bg-secondary/60 hover:ring-primary/30 active:bg-secondary",
                )}
              >
                {resolved ? (
                  <span
                    className={cn(
                      "absolute top-2 right-2 flex size-5 items-center justify-center rounded-full",
                      active
                        ? "bg-primary/30 text-success-foreground"
                        : "bg-success-soft text-success-foreground",
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
                  <span className="text-xs text-muted-foreground">
                    {value} de {AI_ATTEMPTS_PER_BARRIER}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-[11px]",
                    resolved
                      ? "text-success-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {resolved
                    ? "Revisada"
                    : `${group.items.length} ${group.items.length === 1 ? "barrera" : "barreras"}`}
                </p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {selectedGroup ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {selectedGroup.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectedGroup.items.length}{" "}
              {selectedGroup.items.length === 1 ? "barrera" : "barreras"} en
              esta dimensión
            </p>
          </div>

          {selectedGroup.items.map((entry) => {
            const globalIndex = barriers.findIndex((b) => b.id === entry.id);
            const state = displayStateById[entry.id] ?? toState(entry);
            const left = state.remaining;
            const isNext = globalIndex === nextPendingIndex;
            const decision = state.decision;
            const statusLabel =
              decision === "accepted"
                ? "Aceptada"
                : decision === "discarded"
                  ? "Descartada"
                  : isNext
                    ? "Próxima"
                    : "Pendiente";
            const actionLabel =
              decision === "accepted" || state.mode === "ready"
                ? "Ver o cambiar"
                : "Revisar";

            return (
              <Card
                key={entry.id}
                className={cn(
                  "flex-row flex-wrap items-center gap-3 px-(--card-spacing) py-3 sm:flex-nowrap",
                  isNext && "ring-2 ring-ink",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                    isNext
                      ? "bg-ink text-sidebar-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
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
                    {usesBackendApi
                      ? "Si la generación falla, no se descuenta un intento."
                      : `Intentos IA: ${left} de ${AI_ATTEMPTS_PER_BARRIER}`}
                  </p>
                  {state.generateFail ? (
                    <p
                      className="text-xs leading-5 text-danger-foreground"
                      role="status"
                    >
                      Último intento falló. Podés reintentar con Revisar.
                    </p>
                  ) : null}
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      decision === "accepted" && "text-success-foreground",
                      decision === "discarded" && "text-muted-foreground",
                      decision === "pending" && isNext && "text-primary",
                      decision === "pending" &&
                        !isNext &&
                        "text-muted-foreground",
                    )}
                  >
                    {decision === "accepted"
                      ? "✓ "
                      : decision === "discarded"
                        ? "– "
                        : isNext
                          ? "→ "
                          : "○ "}
                    {statusLabel}
                  </span>
                  <Button
                    type="button"
                    variant={
                      isNext || state.generateFail ? "default" : "outline"
                    }
                    className={cn(
                      "h-9 rounded-xl px-3",
                      (isNext || state.generateFail) &&
                        "bg-ink text-sidebar-primary-foreground hover:bg-ink/90",
                    )}
                    disabled={isOpeningEdit || state.mode === "generating"}
                    onClick={() => openBarrier(entry)}
                  >
                    {state.mode === "generating" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles
                          className="size-3.5 animate-pulse"
                          aria-hidden="true"
                        />
                        Generando…
                      </span>
                    ) : state.generateFail ? (
                      "Reintentar"
                    ) : (
                      actionLabel
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}

          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Revisar</span> abre el
            detalle. Ahí podés generar una propuesta con IA.{" "}
            <span className="font-medium text-foreground">Ver o cambiar</span>{" "}
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
