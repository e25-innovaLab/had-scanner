"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { ChevronLeft, ChevronRight, Pencil, Sparkles } from "lucide-react"
import { IntentMeter } from "@/components/aula/intent-meter"
import { MissingAnalysis } from "@/components/aula/missing-analysis"
import { Pill } from "@/components/aula/pill"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api/client"
import type { ApiBarrier, BarrierDecision } from "@/lib/api/types"
import { resolveAnalysisId, withAnalysisId } from "@/lib/api/url"
import {
  AI_ATTEMPTS_PER_BARRIER,
  GENERATE_TIMEOUT_MS,
  RESUME_EDIT_TIMEOUT_MS,
} from "@/lib/aula"

export type AdaptCounts = {
  accepted: number
  discarded: number
  pending: number
  total: number
}

type Mode = "empty" | "generating" | "ready"

type BarrierState = {
  mode: Mode
  proposal: string | null
  decision: BarrierDecision
  remaining: number
}

function toState(barrier: ApiBarrier): BarrierState {
  return {
    mode: barrier.hasProposal || barrier.currentProposal ? "ready" : "empty",
    proposal: barrier.currentProposal ?? barrier.draft,
    decision: barrier.status,
    remaining: barrier.remainingAttempts,
  }
}

export function AdaptBoard({
  onCountsChange,
}: {
  onCountsChange?: (counts: AdaptCounts) => void
} = {}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const analysisId = resolveAnalysisId(searchParams.get("analysisId"))

  const [barriers, setBarriers] = useState<ApiBarrier[]>([])
  const [stateById, setStateById] = useState<Record<string, BarrierState>>({})
  const [pages, setPages] = useState<Record<string, number>>({})
  const [overlay, setOverlay] = useState<{
    entryId: string
    kind: "generate" | "edit"
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!analysisId) return
    const { barriers: list } = await api.listBarriersFlat(analysisId)
    setBarriers(list)
    setStateById(
      Object.fromEntries(list.map((item) => [item.id, toState(item)]))
    )
  }, [analysisId])

  useEffect(() => {
    if (!analysisId) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        await load()
        if (!cancelled) setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setOverlay(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [analysisId, load, pathname])

  const dimensions = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, { id: string; name: string; items: ApiBarrier[] }>()
    for (const barrier of barriers) {
      if (!map.has(barrier.dimensionId)) {
        order.push(barrier.dimensionId)
        map.set(barrier.dimensionId, {
          id: barrier.dimensionId,
          name: barrier.dimension,
          items: [],
        })
      }
      map.get(barrier.dimensionId)!.items.push(barrier)
    }
    return order.map((id) => map.get(id)!)
  }, [barriers])

  const overlayEntry = barriers.find((entry) => entry.id === overlay?.entryId)
  const isBusy = Boolean(overlay)

  const counts = useMemo(() => {
    let accepted = 0
    let discarded = 0
    let pending = 0
    for (const barrier of barriers) {
      const state = stateById[barrier.id]
      const decision = state?.decision ?? barrier.status
      if (decision === "accepted") accepted += 1
      else if (decision === "discarded") discarded += 1
      else pending += 1
    }
    return { accepted, discarded, pending, total: barriers.length }
  }, [barriers, stateById])

  useEffect(() => {
    onCountsChange?.(counts)
  }, [counts, onCountsChange])

  async function decide(id: string, decision: BarrierDecision) {
    if (!analysisId) return
    if (decision === "accepted") await api.accept(analysisId, id)
    else if (decision === "discarded") await api.discard(analysisId, id)
    setStateById((current) => ({
      ...current,
      [id]: { ...current[id], decision },
    }))
  }

  function resumeEdit(entry: ApiBarrier) {
    if (isBusy || !analysisId) return
    const left = stateById[entry.id]?.remaining ?? entry.remainingAttempts
    setOverlay({ entryId: entry.id, kind: "edit" })
    window.setTimeout(() => {
      void api.reopen(analysisId, entry.id).finally(() => {
        navigate(
          withAnalysisId(
            `/analisis/detalle?origen=ia&desde=editar&barrera=${encodeURIComponent(entry.id)}&intentos=${left}`,
            analysisId
          )
        )
      })
    }, RESUME_EDIT_TIMEOUT_MS)
  }

  function generate(entry: ApiBarrier) {
    const left = stateById[entry.id]?.remaining ?? entry.remainingAttempts
    if (left <= 0 || isBusy || !analysisId) return

    setOverlay({ entryId: entry.id, kind: "generate" })
    setStateById((current) => ({
      ...current,
      [entry.id]: { ...current[entry.id], mode: "generating" },
    }))

    window.setTimeout(() => {
      void (async () => {
        try {
          const { barrier } = await api.createProposal(analysisId, entry.id)
          navigate(
            withAnalysisId(
              `/analisis/detalle?origen=ia&desde=generar&barrera=${encodeURIComponent(entry.id)}&intentos=${barrier.remainingAttempts}`,
              analysisId
            )
          )
        } catch (err) {
          setOverlay(null)
          setStateById((current) => ({
            ...current,
            [entry.id]: { ...current[entry.id], mode: "empty" },
          }))
          setError(err instanceof Error ? err.message : "No se pudo generar")
        }
      })()
    }, GENERATE_TIMEOUT_MS)
  }

  if (!analysisId) {
    return <MissingAnalysis step="adaptar barreras" />
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando adaptaciones...</p>
  }

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
                {overlay.kind === "generate" ? (
                  <Sparkles className="size-6 animate-pulse text-primary" aria-hidden="true" />
                ) : (
                  <Pencil className="size-6 text-primary" aria-hidden="true" />
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold">
                  {overlay.kind === "generate"
                    ? "Generando propuesta con IA"
                    : "Abriendo edición"}
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
                      overlay.kind === "generate"
                        ? GENERATE_TIMEOUT_MS
                        : RESUME_EDIT_TIMEOUT_MS
                    }ms linear forwards`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {overlay.kind === "generate"
                  ? "Cuando termine, vas a ver el detalle de la propuesta."
                  : "Te llevamos al detalle para seguir ajustando la propuesta."}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Pendientes", counts.pending],
          ["Aceptadas", counts.accepted],
          ["Editadas", 0],
          ["Descartadas", counts.discarded],
        ].map(([label, value]) => (
          <Card key={String(label)} className="items-center text-center">
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {counts.total > 0 && counts.pending === 0 ? (
        <Card className="border-success-foreground/20 bg-success-soft/40">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">No quedan barreras pendientes</p>
              <p className="text-sm text-muted-foreground">
                Ya podés obtener el material adaptado y el informe.
              </p>
            </div>
            <Button
              className="h-10 px-4 sm:shrink-0"
              nativeButton={false}
              render={
                <Link
                  to={withAnalysisId("/analisis/resultado", analysisId)}
                />
              }
            >
              Obtener resultado
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Intentos de IA por barrera</CardTitle>
          <p className="text-xs text-muted-foreground sm:text-right">
            Cada barrera tiene {AI_ATTEMPTS_PER_BARRIER} intentos propios · se muestra
            la barrera activa de cada dimensión
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))] gap-3">
          {dimensions.map((group) => {
            const page = Math.min(
              pages[group.id] ?? 0,
              Math.max(0, group.items.length - 1)
            )
            const entry = group.items[page]
            const value =
              stateById[entry?.id]?.remaining ??
              entry?.remainingAttempts ??
              AI_ATTEMPTS_PER_BARRIER
            return (
              <div
                key={group.id}
                className="min-w-0 space-y-2 rounded-lg bg-secondary/60 px-3 py-3 ring-1 ring-border"
              >
                <p className="text-xs leading-4 font-medium wrap-break-word">
                  {group.name}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <IntentMeter remaining={value} total={AI_ATTEMPTS_PER_BARRIER} />
                  <span className="text-xs text-muted-foreground">
                    {value} de {AI_ATTEMPTS_PER_BARRIER}
                  </span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {dimensions.map((group) => {
        const page = Math.min(
          pages[group.id] ?? 0,
          Math.max(0, group.items.length - 1)
        )
        const entry = group.items[page]
        if (!entry) return null

        const state = stateById[entry.id] ?? toState(entry)
        const left = state.remaining
        const total = group.items.length
        const showPager = total > 1

        return (
          <Card key={group.id}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="role">{group.name}</Pill>
                <span className="text-xs text-muted-foreground">
                  {total} {total === 1 ? "barrera" : "barreras"}
                </span>
              </div>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <IntentMeter remaining={left} total={AI_ATTEMPTS_PER_BARRIER} />
                Quedan {left} de {AI_ATTEMPTS_PER_BARRIER} intentos de IA
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              {showPager ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <p className="text-xs text-muted-foreground" aria-live="polite">
                    Barrera {page + 1} de {total}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 0}
                      aria-label="Barrera anterior"
                      onClick={() =>
                        setPages((prev) => ({ ...prev, [group.id]: page - 1 }))
                      }
                    >
                      <ChevronLeft aria-hidden="true" />
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= total - 1}
                      aria-label="Barrera siguiente"
                      onClick={() =>
                        setPages((prev) => ({ ...prev, [group.id]: page + 1 }))
                      }
                    >
                      Siguiente
                      <ChevronRight aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <h2 className="text-base font-semibold">{entry.title}</h2>
                <p className="text-sm leading-6">
                  <span className="text-muted-foreground">¿Por qué es barrera? </span>
                  {entry.why}
                </p>
                <p className="text-sm leading-6">
                  <span className="text-muted-foreground">Dónde está: </span>
                  {entry.where}
                </p>
                <p className="text-sm leading-6">
                  <span className="text-muted-foreground">Recomendación: </span>
                  {entry.recommendation}
                </p>
              </div>

              {state.mode === "ready" && state.proposal ? (
                <p className="text-sm leading-6">
                  <span className="font-medium">Propuesta IA: </span>
                  {state.proposal}
                </p>
              ) : null}
              {state.mode === "empty" ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">Propuesta IA: </span>
                  todavía no generada. Generarla usa 1 de los {AI_ATTEMPTS_PER_BARRIER}{" "}
                  intentos de esta barrera.
                </p>
              ) : null}
              {state.mode === "generating" ? (
                <div className="space-y-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-[#c4b49a]" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generando propuesta con IA... Si falla, el intento no se descuenta.
                  </p>
                </div>
              ) : null}

              {state.decision === "accepted" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <p className="text-sm font-medium text-success-foreground">Aceptada</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-4"
                    onClick={() => resumeEdit(entry)}
                  >
                    Volver a editar
                  </Button>
                </div>
              ) : state.decision === "discarded" ? (
                <p className="text-sm font-medium text-muted-foreground">Descartada</p>
              ) : state.mode === "generating" ? (
                <Button type="button" disabled className="h-10 px-4">
                  Generando...
                </Button>
              ) : state.mode === "empty" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    className="h-10 px-4"
                    disabled={isBusy || left === 0}
                    onClick={() => generate(entry)}
                  >
                    <Sparkles data-icon="inline-start" aria-hidden="true" />
                    Generar propuesta con IA
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 px-4"
                    nativeButton={false}
                    render={
                      <Link
                        to={withAnalysisId(
                          `/analisis/detalle?origen=manual&barrera=${encodeURIComponent(entry.id)}`,
                          analysisId
                        )}
                      />
                    }
                  >
                    Adaptar a mano
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-4"
                    onClick={() => void decide(entry.id, "discarded")}
                  >
                    Descartar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    className="h-10 px-4"
                    onClick={() => void decide(entry.id, "accepted")}
                  >
                    Aceptar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 px-4"
                    nativeButton={false}
                    render={
                      <Link
                        to={withAnalysisId(
                          `/analisis/detalle?origen=ia&barrera=${encodeURIComponent(entry.id)}&intentos=${left}`,
                          analysisId
                        )}
                      />
                    }
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-4"
                    onClick={() => void decide(entry.id, "discarded")}
                  >
                    Descartar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
