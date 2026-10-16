"use client"

import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Info, RotateCcw, Sparkles } from "lucide-react"
import { IntentMeter } from "@/components/aula/intent-meter"
import { MissingAnalysis } from "@/components/aula/missing-analysis"
import { Pill } from "@/components/aula/pill"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { api } from "@/lib/api/client"
import type { ApiBarrier } from "@/lib/api/types"
import { resolveAnalysisId, withAnalysisId } from "@/lib/api/url"
import {
  AI_ATTEMPTS_PER_BARRIER,
  GENERATE_TIMEOUT_MS,
  countSentences,
  countWords,
  readingLabel,
  type Severity,
} from "@/lib/aula"
import { cn } from "@/lib/utils"

const VERSION_ACTIONS = [
  { id: "simple", label: "Más simple" },
  { id: "breve", label: "Más breve" },
  { id: "pasos", label: "Dividir en pasos" },
  { id: "ejemplo", label: "Agregar un ejemplo" },
] as const

type VariantId = keyof ApiBarrier["variants"]

export function DetailEditor({
  initialRemaining: _initialRemaining,
}: {
  initialRemaining: number
}) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const analysisId = resolveAnalysisId(searchParams.get("analysisId"))
  const startsWithoutProposal = searchParams.get("origen") === "manual"
  const desde = searchParams.get("desde")
  const fromGenerate = desde === "generar"
  const withEntrance = desde === "generar" || desde === "editar"
  const barrierFromQuery = searchParams.get("barrera")

  const [barriers, setBarriers] = useState<ApiBarrier[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [text, setText] = useState("")
  const [aiBaseline, setAiBaseline] = useState("")
  const [hasProposal, setHasProposal] = useState(false)
  const [saved, setSaved] = useState(false)
  const [left, setLeft] = useState(AI_ATTEMPTS_PER_BARRIER)

  useEffect(() => {
    if (!analysisId) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const { barriers: list } = await api.listBarriersFlat(analysisId)
        if (cancelled) return
        setBarriers(list)
        const start = Math.max(
          0,
          list.findIndex((item) => item.id === barrierFromQuery)
        )
        const idx = barrierFromQuery && start >= 0 ? start : 0
        setIndex(idx)
        applyBarrier(list[idx], {
          startsWithoutProposal,
          fromGenerate,
        })
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // Solo reacciona a analysisId / barrera de query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, barrierFromQuery, startsWithoutProposal, fromGenerate])

  function applyBarrier(
    barrier: ApiBarrier | undefined,
    opts: { startsWithoutProposal: boolean; fromGenerate: boolean }
  ) {
    if (!barrier) return
    const forceProposal = opts.fromGenerate || !opts.startsWithoutProposal
    const proposal = barrier.currentProposal ?? barrier.draft ?? ""
    const showProposal =
      opts.fromGenerate ||
      barrier.hasProposal ||
      (forceProposal && Boolean(proposal) && !opts.startsWithoutProposal)

    setLeft(barrier.remainingAttempts)
    setSaved(barrier.status === "accepted")
    setHasProposal(showProposal || Boolean(barrier.hasProposal && proposal))
    setAiBaseline(barrier.currentProposal ?? proposal)
    setText(
      opts.startsWithoutProposal && !barrier.hasProposal
        ? barrier.draft ?? ""
        : barrier.draft ?? proposal
    )
    setGenerating(false)
    setNoteOpen(false)
  }

  const suggestion = barriers[index]

  const pendingCount = useMemo(
    () => barriers.filter((item) => item.status === "pending").length,
    [barriers]
  )
  const allResolved = barriers.length > 0 && pendingCount === 0

  const words = countWords(text)
  const sentences = countSentences(text)
  const reading = readingLabel(text)
  const originalWords = countWords(suggestion?.original ?? "")
  const originalSentences = countSentences(suggestion?.original ?? "")
  const edited =
    hasProposal && text.trim() !== aiBaseline.trim() && text.trim().length > 0

  const nextPendingIndex = useMemo(() => {
    const after = barriers.findIndex(
      (item, i) => i > index && item.status === "pending"
    )
    if (after >= 0) return after
    return barriers.findIndex(
      (item, i) => i < index && item.status === "pending"
    )
  }, [barriers, index])

  const nextLabel =
    nextPendingIndex >= 0
      ? `la barrera ${nextPendingIndex + 1} de ${barriers.length}`
      : "el resultado"

  const meta = useMemo(
    () =>
      text.length === 0
        ? "Sin texto todavía"
        : `${words} palabras · ${sentences} ${sentences === 1 ? "oración" : "oraciones"} · Lectura: ${reading}`,
    [text.length, words, sentences, reading]
  )

  function setBarrierStatusLocal(
    barrierId: string,
    status: ApiBarrier["status"]
  ) {
    setBarriers((current) =>
      current.map((item) =>
        item.id === barrierId ? { ...item, status } : item
      )
    )
  }

  function goToResultado() {
    navigate(withAnalysisId("/analisis/resultado", analysisId))
  }

  async function persistDraft(value: string) {
    if (!analysisId || !suggestion) return
    setText(value)
    try {
      await api.saveDraft(analysisId, suggestion.id, value)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el borrador")
    }
  }

  async function generateProposal() {
    if (!analysisId || !suggestion || saved || left <= 0 || generating || hasProposal)
      return
    setGenerating(true)
    window.setTimeout(() => {
      void (async () => {
        try {
          const { barrier } = await api.createProposal(analysisId, suggestion.id)
          setText(barrier.draft ?? barrier.currentProposal ?? "")
          setAiBaseline(barrier.currentProposal ?? "")
          setHasProposal(true)
          setLeft(barrier.remainingAttempts)
          setSaved(false)
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo generar")
        } finally {
          setGenerating(false)
        }
      })()
    }, GENERATE_TIMEOUT_MS)
  }

  async function consume(variant: VariantId) {
    if (!analysisId || !suggestion || saved || left <= 0) return
    try {
      const { barrier } = await api.createProposal(analysisId, suggestion.id, {
        variant,
      })
      setText(barrier.draft ?? barrier.currentProposal ?? "")
      setAiBaseline(barrier.currentProposal ?? "")
      setHasProposal(true)
      setLeft(barrier.remainingAttempts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar variante")
    }
  }

  function goTo(nextIndex: number, list: ApiBarrier[] = barriers) {
    const next = list[nextIndex]
    if (!next) return
    setIndex(nextIndex)
    applyBarrier(next, {
      startsWithoutProposal: false,
      fromGenerate: false,
    })
  }

  function advance(fromStatuses?: ApiBarrier[]) {
    const list = fromStatuses ?? barriers
    const stillPending = list.filter((item) => item.status === "pending")
    if (stillPending.length === 0) {
      goToResultado()
      return
    }
    const after = list.findIndex(
      (item, i) => i > index && item.status === "pending"
    )
    const target =
      after >= 0
        ? after
        : list.findIndex((item) => item.status === "pending")
    if (target >= 0) {
      goTo(target, list)
      return
    }
    goToResultado()
  }

  async function saveAndAccept() {
    if (!analysisId || !suggestion) return
    try {
      await api.accept(analysisId, suggestion.id, text)
      setSaved(true)
      setHasProposal(true)
      const nextList = barriers.map((item) =>
        item.id === suggestion.id
          ? { ...item, status: "accepted" as const }
          : item
      )
      setBarriers(nextList)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aceptar")
    }
  }

  async function discardSuggestion() {
    if (!analysisId || !suggestion) return
    try {
      await api.discard(analysisId, suggestion.id)
      setSaved(false)
      const nextList = barriers.map((item) =>
        item.id === suggestion.id
          ? { ...item, status: "discarded" as const }
          : item
      )
      setBarriers(nextList)
      advance(nextList)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descartar")
    }
  }

  async function resumeEditing() {
    if (!analysisId || !suggestion) return
    try {
      await api.reopen(analysisId, suggestion.id)
      setSaved(false)
      setHasProposal(false)
      setBarrierStatusLocal(suggestion.id, "pending")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reabrir")
    }
  }

  if (!analysisId) {
    return <MissingAnalysis step="editar el detalle" />
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando edición...</p>
  }

  if (!suggestion) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay barreras en este análisis.
      </p>
    )
  }

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl space-y-5 pb-20",
        withEntrance && "animate-in fade-in slide-in-from-bottom-1 duration-500"
      )}
    >
      {error ? (
        <p className="text-sm text-danger-foreground" role="alert">
          {error}
        </p>
      ) : null}
      {allResolved ? (
        <Card className="border-success-foreground/20 bg-success-soft/40">
          <div className="flex flex-col gap-3 px-(--card-spacing) py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">No quedan barreras pendientes</p>
              <p className="text-sm text-muted-foreground">
                Podés obtener el resultado o seguir revisando propuestas guardadas.
              </p>
            </div>
            <Button
              type="button"
              className="h-10 px-4 sm:shrink-0"
              onClick={goToResultado}
            >
              Obtener resultado
            </Button>
          </div>
        </Card>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to={withAnalysisId("/analisis/adaptar", analysisId)}
          className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3")}
        >
          ← Volver a Adaptar
        </Link>
        <BarrierPager
          index={index}
          total={barriers.length}
          onPrevious={() => goTo(index - 1)}
          onNext={() => goTo(index + 1)}
        />
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="step">Paso 05</Pill>
          <Pill tone="role">Docente + IA</Pill>
          <Pill tone="outline">{suggestion.dimension}</Pill>
          <Pill tone={suggestion.severity}>{severityName(suggestion.severity)}</Pill>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[1.7rem]">
            {suggestion.title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            {saved
              ? "Propuesta guardada. Podés continuar con la siguiente barrera o volver a editar para generar otra o ajustarla a mano."
              : hasProposal
                ? "Revisá la observación, ajustá la propuesta si lo necesitás y decidí. Ningún cambio se aplica automáticamente."
                : "El original está a la izquierda. Generá una propuesta con IA o escribí tu adaptación a mano."}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          ⌞ Barrera {index + 1} de {barriers.length}
        </p>
      </header>

      <Observation barrier={suggestion} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-white">
          <div className="flex items-center justify-between px-(--card-spacing)">
            <p className="text-sm font-medium">Original</p>
            <Pill tone="muted">Solo lectura</Pill>
          </div>
          <p className="px-(--card-spacing) text-sm leading-7 text-foreground/90">
            &quot;{suggestion.original}&quot;
          </p>
          <p className="px-(--card-spacing) text-xs text-muted-foreground">
            {originalWords} palabras · {originalSentences}{" "}
            {originalSentences === 1 ? "oración" : "oraciones"} · Lectura:{" "}
            {readingLabel(suggestion.original)}
          </p>
        </Card>

        <Card className="bg-[#fbf6ea] ring-[#eadfbe]">
          <div className="flex flex-wrap items-center justify-between gap-2 px-(--card-spacing)">
            <div className="flex items-center gap-2">
              {hasProposal ? <Pill tone="step">IA</Pill> : null}
              <span className="text-sm font-medium">
                {hasProposal ? "Propuesta" : "Editado por vos"}
              </span>
              {edited ? <Pill tone="role">Editado por vos</Pill> : null}
            </div>
            {hasProposal && !saved ? (
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => void persistDraft(aiBaseline)}
              >
                <RotateCcw data-icon="inline-start" aria-hidden="true" />
                Restaurar propuesta IA
              </Button>
            ) : null}
            {saved ? <Pill tone="ok">Guardada</Pill> : null}
          </div>
          <div className="px-(--card-spacing)">
            <label className="sr-only" htmlFor="propuesta">
              Propuesta editable
            </label>
            <textarea
              id="propuesta"
              value={text}
              rows={6}
              readOnly={saved}
              placeholder={
                hasProposal
                  ? undefined
                  : "Escribí tu adaptación o generá una propuesta con IA."
              }
              onChange={(event) => setText(event.target.value)}
              onBlur={() => {
                if (!saved) void persistDraft(text)
              }}
              className={cn(
                "w-full resize-y rounded-lg border border-[#e4dcc8] bg-white px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                saved && "cursor-default bg-[#f7f3e8] text-foreground/90"
              )}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-(--card-spacing) text-xs text-muted-foreground">
            <span>{meta}</span>
            {edited ? <span>Cambios sin guardar</span> : null}
            {saved ? <span>Propuesta aceptada</span> : null}
          </div>
          {!saved ? (
            <div className="space-y-3 px-(--card-spacing)">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {hasProposal
                    ? "Pedir otra versión a la IA"
                    : "Generar propuesta con IA"}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <IntentMeter remaining={left} total={AI_ATTEMPTS_PER_BARRIER} />
                  {left === 0 ? "0" : `quedan ${left}`} de {AI_ATTEMPTS_PER_BARRIER}{" "}
                  intentos
                </span>
              </div>

              {!hasProposal ? (
                <>
                  <Button
                    type="button"
                    className="h-9 px-4"
                    disabled={left === 0 || generating}
                    onClick={() => void generateProposal()}
                  >
                    <Sparkles data-icon="inline-start" aria-hidden="true" />
                    {generating ? "Generando..." : "Generar propuesta"}
                  </Button>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Generar la primera propuesta usa 1 de los {AI_ATTEMPTS_PER_BARRIER}{" "}
                    intentos de esta barrera.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {VERSION_ACTIONS.map((action) => (
                      <Button
                        key={action.id}
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full bg-white px-3"
                        disabled={left === 0}
                        onClick={() => void consume(action.id)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-full bg-white px-3"
                    disabled={left === 0}
                    onClick={() => void consume("otra")}
                  >
                    <RotateCcw data-icon="inline-start" aria-hidden="true" />
                    Otra versión
                  </Button>
                  {left === 0 ? (
                    <Card className="bg-warning-soft text-warning-foreground ring-warning-foreground/15">
                      <div className="flex gap-3 px-(--card-spacing)">
                        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <div className="space-y-1 text-sm leading-6">
                          <p className="font-semibold">
                            Usaste los {AI_ATTEMPTS_PER_BARRIER} intentos de IA de esta
                            barrera
                          </p>
                          <p>
                            Todavía podés editar el texto a mano y guardar, o descartar.
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Cada nueva versión usa 1 intento. Son {AI_ATTEMPTS_PER_BARRIER}{" "}
                      por barrera.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="px-(--card-spacing) text-xs leading-5 text-muted-foreground">
              Para cambiar esta propuesta, usá Volver a editar.
            </p>
          )}
        </Card>
      </div>

      <div>
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-2"
          aria-expanded={noteOpen}
          onClick={() => setNoteOpen((open) => !open)}
        >
          + Agregar una nota para el informe (opcional)
        </Button>
        {noteOpen ? (
          <textarea
            rows={3}
            placeholder="Esta nota queda en el informe, no en el material adaptado."
            className="mt-2 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-center lg:justify-between">
        <Button
          type="button"
          variant="outline"
          className="h-10 px-4"
          onClick={() =>
            navigate(withAnalysisId("/analisis/adaptar", analysisId))
          }
        >
          Cancelar
        </Button>
        <p className="text-sm text-muted-foreground lg:flex-1 lg:text-center">
          {saved
            ? `Propuesta guardada. Usá Siguiente o tocá Propuesta guardada para pasar a ${nextLabel}.`
            : left === 0
              ? `Sin intentos de IA en esta barrera: guardá tu edición o descartá para pasar a ${nextLabel}.`
              : `Al guardar, la propuesta queda aceptada. Podés seguir a ${nextLabel} después.`}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {saved ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4"
              onClick={() => void resumeEditing()}
            >
              Volver a editar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4"
              onClick={() => void discardSuggestion()}
            >
              Descartar sugerencia
            </Button>
          )}
          {saved ? (
            <Button
              type="button"
              className="h-10 px-4 bg-success-soft text-success-foreground hover:bg-success-soft/80"
              onClick={() => advance()}
            >
              {allResolved || nextPendingIndex < 0
                ? "Obtener resultado"
                : "Propuesta guardada"}
            </Button>
          ) : (
            <Button
              type="button"
              className="h-10 px-4"
              disabled={!hasProposal && text.trim().length === 0}
              onClick={() => void saveAndAccept()}
            >
              Guardar y aceptar
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <BarrierPager
          index={index}
          total={barriers.length}
          onPrevious={() => goTo(index - 1)}
          onNext={() => goTo(index + 1)}
        />
      </div>
    </div>
  )
}

function BarrierPager({
  index,
  total,
  onPrevious,
  onNext,
}: {
  index: number
  total: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground" aria-live="polite">
        Barrera {index + 1} de {total}
      </span>
      <Button
        type="button"
        variant="outline"
        className="h-9 px-3"
        disabled={index === 0}
        onClick={onPrevious}
      >
        ‹ Anterior
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-9 px-3"
        disabled={index === total - 1}
        onClick={onNext}
      >
        Siguiente ›
      </Button>
    </div>
  )
}

function Observation({ barrier }: { barrier: ApiBarrier }) {
  return (
    <Card className="bg-[#f8f3e8] ring-[#eadfce]">
      <div className="flex flex-wrap items-start justify-between gap-3 px-(--card-spacing)">
        <div className="flex items-center gap-2">
          <Pill tone="step">IA</Pill>
          <p className="font-medium">Observación de la IA</p>
        </div>
        <p className="text-xs text-muted-foreground">Criterio: {barrier.criterion}</p>
      </div>
      <div className="grid gap-4 px-(--card-spacing) md:grid-cols-3">
        <ObservationColumn title="Qué detectó" body={barrier.detected} />
        <ObservationColumn title="Por qué es una barrera" body={barrier.why} />
        <ObservationColumn title="Qué propone" body={barrier.proposes} />
      </div>
      <p className="px-(--card-spacing) text-sm text-muted-foreground">
        Ubicación: {barrier.location}{" "}
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="link" className="h-auto px-1 text-foreground" />
            }
          >
            Ver en el documento →
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ubicación en el documento</DialogTitle>
              <DialogDescription>
                {barrier.location}. El original permanece intacto: esta marca
                solo indica dónde se aplicaría el cambio si lo aceptás.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </p>
    </Card>
  )
}

function ObservationColumn({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <p className="text-sm leading-6">{body}</p>
    </div>
  )
}

function severityName(severity: Severity) {
  if (severity === "alta") return "Severidad alta"
  if (severity === "media") return "Severidad media"
  return "Severidad baja"
}
