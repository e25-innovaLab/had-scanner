"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Info, RotateCcw, Sparkles } from "lucide-react";
import { IntentMeter } from "@/components/aula/intent-meter";
import { MissingAnalysis } from "@/components/aula/missing-analysis";
import { Pill } from "@/components/aula/pill";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { isBackendId } from "@/lib/api/ids";
import {
  PROPOSAL_JOB_STATUS,
  clearProposalJob,
  startProposal,
  useProposalJob,
} from "@/lib/api/proposal-jobs";
import type { ApiBarrier } from "@/lib/api/types";
import { resolveAnalysisId, withAnalysisId } from "@/lib/api/url";
import {
  AI_ATTEMPTS_PER_BARRIER,
  countSentences,
  countWords,
  readingLabel,
  type Severity,
} from "@/lib/aula";
import { cn } from "@/lib/utils";

const VERSION_ACTIONS = [
  { id: "simple", label: "Más simple" },
  { id: "breve", label: "Más breve" },
  { id: "pasos", label: "Dividir en pasos" },
  { id: "ejemplo", label: "Agregar un ejemplo" },
] as const;

const TEXT_FADE_MS = 180;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

type VariantId = keyof ApiBarrier["variants"];

export function DetailEditor({
  initialRemaining: _initialRemaining,
}: {
  initialRemaining: number;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analysisId = resolveAnalysisId(searchParams.get("analysisId"));
  const usesBackendApi = Boolean(analysisId && isBackendId(analysisId));
  const startsWithoutProposal = searchParams.get("origen") === "manual";
  const desde = searchParams.get("desde");
  const fromGenerate = desde === "generar";
  const withEntrance = desde === "generar" || desde === "editar";
  const barrierFromQuery = searchParams.get("barrera");

  const [barriers, setBarriers] = useState<ApiBarrier[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingVariant, setPendingVariant] = useState<VariantId | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [actionPending, setActionPending] = useState<"save" | "discard" | null>(
    null,
  );
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [text, setText] = useState("");
  const [textOpaque, setTextOpaque] = useState(true);
  const [aiBaseline, setAiBaseline] = useState("");
  const [hasProposal, setHasProposal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [left, setLeft] = useState(AI_ATTEMPTS_PER_BARRIER);
  const [appliedJobKey, setAppliedJobKey] = useState<string | null>(null);

  function applyBarrier(
    barrier: ApiBarrier | undefined,
    opts: { startsWithoutProposal: boolean; fromGenerate: boolean },
  ) {
    if (!barrier) return;
    const forceProposal = opts.fromGenerate || !opts.startsWithoutProposal;
    const proposal = barrier.currentProposal ?? barrier.draft ?? "";
    const showProposal =
      opts.fromGenerate ||
      barrier.hasProposal ||
      Boolean(proposal) ||
      (forceProposal && Boolean(proposal) && !opts.startsWithoutProposal);

    setLeft(barrier.remainingAttempts);
    setSaved(barrier.status === "accepted");
    setHasProposal(showProposal || Boolean(barrier.hasProposal && proposal));
    setAiBaseline(barrier.currentProposal ?? proposal);
    setText(
      opts.startsWithoutProposal && !barrier.hasProposal && !proposal
        ? (barrier.draft ?? "")
        : (barrier.draft ?? proposal),
    );
    setPendingVariant(null);
    setGenerateError(null);
    setNoteOpen(false);
  }

  useEffect(() => {
    if (!analysisId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { barriers: list } = await api.getBarriersFlatForUi(analysisId);
        if (cancelled) return;
        setBarriers(list);
        const fromQuery = barrierFromQuery
          ? list.findIndex((item) => item.id === barrierFromQuery)
          : -1;
        const firstPending = list.findIndex(
          (item) => item.status === "pending",
        );
        const idx =
          fromQuery >= 0 ? fromQuery : firstPending >= 0 ? firstPending : 0;
        setIndex(idx);
        applyBarrier(list[idx], {
          startsWithoutProposal,
          fromGenerate,
        });
        const current = list[idx];
        if (current) {
          const nextUrl = withAnalysisId(
            `/analisis/detalle?origen=${startsWithoutProposal ? "manual" : "ia"}${fromGenerate ? "&desde=generar" : ""}&barrera=${encodeURIComponent(current.id)}&dimension=${encodeURIComponent(current.dimensionId)}&i=${idx + 1}&n=${list.length}`,
            analysisId,
          );
          if (
            searchParams.get("barrera") !== current.id ||
            searchParams.get("i") !== String(idx + 1) ||
            searchParams.get("n") !== String(list.length) ||
            searchParams.get("dimension") !== current.dimensionId
          ) {
            navigate(nextUrl, { replace: true });
          }
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Solo reacciona a analysisId / barrera de query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, barrierFromQuery, startsWithoutProposal, fromGenerate]);

  const suggestion = barriers[index];
  const isDiscarded = suggestion?.status === "discarded";
  const isClosed = Boolean(
    suggestion && (suggestion.status === "accepted" || isDiscarded),
  );
  const proposalJob = useProposalJob(analysisId, suggestion?.id);
  const generating = proposalJob?.status === PROPOSAL_JOB_STATUS.PENDING;

  useEffect(() => {
    setAppliedJobKey(null);
  }, [suggestion?.id]);

  useEffect(() => {
    if (!analysisId || !suggestion || !proposalJob) return;

    const jobKey = `${proposalJob.analysisId}:${proposalJob.barrierId}:${proposalJob.status}`;
    if (jobKey === appliedJobKey) return;

    if (proposalJob.status === PROPOSAL_JOB_STATUS.PENDING) {
      setGenerateError(null);
      if (proposalJob.variant) {
        setPendingVariant(proposalJob.variant);
      }
      return;
    }

    if (
      proposalJob.status === PROPOSAL_JOB_STATUS.SUCCESS &&
      proposalJob.barrier
    ) {
      const barrier = proposalJob.barrier;
      setAppliedJobKey(jobKey);
      setAiBaseline(barrier.currentProposal ?? "");
      setHasProposal(true);
      setLeft(barrier.remainingAttempts);
      setBarriers((current) =>
        current.map((item) => (item.id === barrier.id ? barrier : item)),
      );
      setSaved(false);
      setGenerateError(null);
      clearProposalJob(analysisId, suggestion.id);
      void swapProposalText(barrier.draft ?? barrier.currentProposal ?? "");
      return;
    }

    if (proposalJob.status === PROPOSAL_JOB_STATUS.ERROR) {
      const message = proposalJob.error ?? "No se pudo generar la propuesta.";
      setAppliedJobKey(jobKey);
      if (proposalJob.variant) {
        setError(message);
      } else {
        setGenerateError(message);
      }
      setPendingVariant(null);
      setTextOpaque(true);
      clearProposalJob(analysisId, suggestion.id);
    }
    // swapProposalText is stable enough for this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, suggestion, proposalJob, appliedJobKey]);

  const pendingCount = useMemo(
    () => barriers.filter((item) => item.status === "pending").length,
    [barriers],
  );
  const allResolved = barriers.length > 0 && pendingCount === 0;

  const words = countWords(text);
  const sentences = countSentences(text);
  const reading = readingLabel(text);
  const originalWords = countWords(suggestion?.original ?? "");
  const originalSentences = countSentences(suggestion?.original ?? "");
  const edited =
    hasProposal && text.trim() !== aiBaseline.trim() && text.trim().length > 0;

  const nextPendingIndex = useMemo(() => {
    const after = barriers.findIndex(
      (item, i) => i > index && item.status === "pending",
    );
    if (after >= 0) return after;
    return barriers.findIndex(
      (item, i) => i < index && item.status === "pending",
    );
  }, [barriers, index]);

  const nextLabel =
    nextPendingIndex >= 0
      ? `la barrera ${nextPendingIndex + 1} de ${barriers.length}`
      : "el resultado";

  const nextBarrierLabel =
    nextPendingIndex >= 0
      ? `barrera ${nextPendingIndex + 1} de ${barriers.length}`
      : "el resultado";

  const meta = useMemo(
    () =>
      text.length === 0
        ? "Sin texto todavía"
        : `${words} palabras · ${sentences} ${sentences === 1 ? "oración" : "oraciones"} · Lectura: ${reading}`,
    [text.length, words, sentences, reading],
  );

  function goToResultado() {
    navigate(withAnalysisId("/analisis/resultado", analysisId));
  }

  function detalleSearch(nextIndex: number, list: ApiBarrier[] = barriers) {
    const next = list[nextIndex];
    if (!next) return "";
    return withAnalysisId(
      `/analisis/detalle?origen=ia&barrera=${encodeURIComponent(next.id)}&dimension=${encodeURIComponent(next.dimensionId)}&i=${nextIndex + 1}&n=${list.length}`,
      analysisId,
    );
  }

  function resumenHref(dimensionId: string) {
    return withAnalysisId(
      `/analisis/adaptar?dimension=${encodeURIComponent(dimensionId)}`,
      analysisId,
    );
  }

  async function persistDraft(value: string) {
    if (!analysisId || !suggestion || usesBackendApi) return;
    setText(value);
    try {
      await api.saveDraft(analysisId, suggestion.id, value);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el borrador",
      );
    }
  }

  async function swapProposalText(next: string) {
    setTextOpaque(false);
    await sleep(TEXT_FADE_MS);
    setText(next);
    setPendingVariant(null);
    await sleep(16);
    setTextOpaque(true);
  }

  function generateProposal() {
    if (
      !analysisId ||
      !suggestion ||
      saved ||
      isDiscarded ||
      left <= 0 ||
      generating ||
      hasProposal
    )
      return;
    setPendingVariant(null);
    setGenerateError(null);
    setAppliedJobKey(null);
    startProposal(analysisId, suggestion.id, {
      barrierTitle: suggestion.title,
      dimensionId: suggestion.dimensionId,
    });
  }

  function consume(variant: VariantId) {
    if (
      !analysisId ||
      !suggestion ||
      saved ||
      isDiscarded ||
      left <= 0 ||
      generating
    ) {
      return;
    }
    setPendingVariant(variant);
    setGenerateError(null);
    setError(null);
    setAppliedJobKey(null);
    startProposal(analysisId, suggestion.id, {
      variant,
      barrierTitle: suggestion.title,
      dimensionId: suggestion.dimensionId,
    });
  }

  async function restoreAiProposal() {
    if (!analysisId || !suggestion || restoring || generating) return;
    setRestoring(true);
    setTextOpaque(false);
    try {
      await sleep(TEXT_FADE_MS);
      await persistDraft(aiBaseline);
      await sleep(16);
      setTextOpaque(true);
    } finally {
      window.setTimeout(() => setRestoring(false), 200);
    }
  }

  function goTo(nextIndex: number, list: ApiBarrier[] = barriers) {
    const next = list[nextIndex];
    if (!next) return;
    setIndex(nextIndex);
    applyBarrier(next, {
      startsWithoutProposal: false,
      fromGenerate: false,
    });
    navigate(detalleSearch(nextIndex, list), { replace: true });
  }

  function isLastBarrierInDimension(list: ApiBarrier[], at: number) {
    const current = list[at];
    if (!current) return false;
    return !list.some(
      (item, i) => i > at && item.dimensionId === current.dimensionId,
    );
  }

  function advance(fromStatuses?: ApiBarrier[]) {
    const list = fromStatuses ?? barriers;
    if (suggestion && isLastBarrierInDimension(list, index)) {
      navigate(resumenHref(suggestion.dimensionId));
      return;
    }
    const stillPending = list.filter((item) => item.status === "pending");
    if (stillPending.length === 0) {
      goToResultado();
      return;
    }
    const after = list.findIndex(
      (item, i) => i > index && item.status === "pending",
    );
    const target =
      after >= 0 ? after : list.findIndex((item) => item.status === "pending");
    if (target >= 0) {
      goTo(target, list);
      return;
    }
    goToResultado();
  }

  async function saveAndAccept() {
    if (
      !analysisId ||
      !suggestion ||
      actionPending ||
      generating ||
      suggestion.status === "discarded" ||
      suggestion.status === "accepted"
    ) {
      return;
    }
    setActionPending("save");
    try {
      await api.accept(analysisId, suggestion.id, text);
      setSaved(true);
      setHasProposal(true);
      const nextList = barriers.map((item) =>
        item.id === suggestion.id
          ? { ...item, status: "accepted" as const }
          : item,
      );
      setBarriers(nextList);
      advance(nextList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aceptar");
    } finally {
      setActionPending(null);
    }
  }

  async function discardSuggestion() {
    if (
      !analysisId ||
      !suggestion ||
      actionPending ||
      generating ||
      suggestion.status === "discarded" ||
      suggestion.status === "accepted"
    ) {
      return;
    }
    setConfirmDiscardOpen(false);
    setActionPending("discard");
    try {
      await api.discard(analysisId, suggestion.id);
      setSaved(false);
      const nextList = barriers.map((item) =>
        item.id === suggestion.id
          ? { ...item, status: "discarded" as const }
          : item,
      );
      setBarriers(nextList);
      advance(nextList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descartar");
    } finally {
      setActionPending(null);
    }
  }

  if (!analysisId) {
    return <MissingAnalysis step="editar el detalle" />;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando edición...</p>;
  }

  if (!suggestion) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay barreras en este análisis.
      </p>
    );
  }

  const attemptsLabel =
    left === 0
      ? `quedan 0 de ${AI_ATTEMPTS_PER_BARRIER} intentos`
      : `quedan ${left} de ${AI_ATTEMPTS_PER_BARRIER} intentos`;

  const lastInDimension = isLastBarrierInDimension(barriers, index);
  const discardingProposal = hasProposal || suggestion.hasProposal;

  const footerHint = generating
    ? "La propuesta aparece en unos segundos. Podés descartar la barrera si no querés esperar."
    : isDiscarded
      ? lastInDimension
        ? `Barrera descartada. Es la última de ${suggestion.dimension}.`
        : `Barrera descartada. Usá Continuar o seguí a ${nextLabel}.`
      : saved
        ? lastInDimension
          ? `Propuesta guardada. Es la última barrera de ${suggestion.dimension}.`
          : `Propuesta guardada. Usá Continuar o seguí a ${nextLabel}.`
        : usesBackendApi
          ? "Aceptá o rechazá la propuesta para continuar."
          : lastInDimension
            ? `Es la última barrera de ${suggestion.dimension}. Al guardar o descartar, la dimensión queda revisada y volvés a Adaptar.`
            : left === 0
              ? `Sin intentos de IA en esta barrera: guardá tu edición o descartá para pasar a ${nextBarrierLabel}.`
              : `Al guardar o descartar, pasás a ${nextBarrierLabel}.`;

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl space-y-5 pb-20",
        withEntrance &&
          "animate-in fade-in slide-in-from-bottom-1 duration-500",
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
              <p className="text-sm font-medium">
                No quedan barreras pendientes
              </p>
              <p className="text-sm text-muted-foreground">
                Podés obtener el resultado o seguir revisando propuestas
                guardadas.
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
          to={resumenHref(suggestion.dimensionId)}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-9 rounded-xl px-3",
          )}
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
          <Pill tone="step">Paso 04</Pill>
          <Pill tone="role">Docente</Pill>
          <Pill tone="outline">{suggestion.dimension}</Pill>
          <Pill tone={suggestion.severity}>
            {priorityName(suggestion.severity)}
          </Pill>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-[1.7rem]">
            {suggestion.title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            {isDiscarded
              ? "Esta barrera quedó descartada. No se puede generar ni aceptar una propuesta."
              : saved
                ? "Propuesta aceptada. Podés continuar con la siguiente barrera; ya no se puede volver a editar."
                : hasProposal
                  ? usesBackendApi
                    ? "Revisá la observación y la propuesta. Aceptá o rechazá: la API actual no guarda ediciones manuales."
                    : "Revisá la observación, ajustá la propuesta si lo necesitás y decidí. Ningún cambio se aplica automáticamente."
                  : usesBackendApi
                    ? "El original está a la izquierda. Generá una propuesta con IA o descartá la barrera."
                    : "El original está a la izquierda. Generá una propuesta con IA o escribí tu adaptación a mano."}
          </p>
        </div>
      </header>

      <Observation barrier={suggestion} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-white">
          <div className="flex items-center justify-between gap-2 px-(--card-spacing)">
            <p className="text-sm font-medium">Original</p>
            <Pill tone="muted">Solo lectura</Pill>
          </div>
          <p className="px-(--card-spacing) text-sm leading-7 text-foreground/90 italic">
            {suggestion.original}
          </p>
          <p className="px-(--card-spacing) text-xs text-muted-foreground">
            {originalWords} palabras · {originalSentences}{" "}
            {originalSentences === 1 ? "oración" : "oraciones"} · Lectura:{" "}
            {readingLabel(suggestion.original)}
          </p>
        </Card>

        <Card className="bg-primary/10 ring-1 ring-primary/30">
          <div className="flex flex-wrap items-center justify-between gap-2 px-(--card-spacing)">
            <div className="flex flex-wrap items-center gap-2">
              {hasProposal || generating ? (
                <Pill tone="step">IA Propuesta</Pill>
              ) : null}
              <span className="text-sm font-medium">
                {hasProposal || generating ? "Propuesta" : "Tu adaptación"}
              </span>
              {edited ? <Pill tone="role">Editado por vos</Pill> : null}
              {saved ? <Pill tone="ok">Guardada</Pill> : null}
              {isDiscarded ? <Pill tone="muted">Descartada</Pill> : null}
            </div>
            {hasProposal &&
            !saved &&
            !isDiscarded &&
            !generating &&
            !usesBackendApi ? (
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-muted-foreground"
                disabled={restoring}
                aria-pressed={restoring}
                onClick={() => void restoreAiProposal()}
              >
                <RotateCcw
                  data-icon="inline-start"
                  aria-hidden="true"
                  className={cn(restoring && "animate-spin")}
                />
                {restoring ? "Restaurando…" : "Restaurar propuesta IA"}
              </Button>
            ) : null}
          </div>

          {generateError && !hasProposal && !isDiscarded ? (
            <div className="px-(--card-spacing)">
              <Card className="border-danger-foreground/20 bg-danger-soft text-danger-foreground shadow-none">
                <div className="space-y-3 px-(--card-spacing) py-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      No pudimos generar la propuesta
                    </p>
                    <p className="text-sm leading-6">{generateError}</p>
                    {!usesBackendApi ? (
                      <p className="text-sm leading-6">
                        Seguís teniendo {left} de {AI_ATTEMPTS_PER_BARRIER}{" "}
                        intentos para esta barrera.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="h-9 rounded-xl px-4"
                      onClick={() => void generateProposal()}
                    >
                      Reintentar
                    </Button>
                    {!usesBackendApi ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl bg-card px-4"
                        onClick={() => setGenerateError(null)}
                      >
                        Escribir mi versión
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl bg-card px-4"
                        onClick={() => setGenerateError(null)}
                      >
                        Cerrar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <>
              {generating ? (
                <div className="px-(--card-spacing)">
                  <Card className="border-primary/30 bg-primary/20 text-foreground shadow-none">
                    <div className="px-(--card-spacing) py-3 text-sm leading-6">
                      <p className="font-semibold">
                        {pendingVariant
                          ? `Generando versión «${
                              VERSION_ACTIONS.find(
                                (a) => a.id === pendingVariant,
                              )?.label ?? "Otra versión"
                            }»…`
                          : "Generando propuesta con IA…"}
                      </p>
                      <p className="text-muted-foreground">
                        El texto actual se mantiene visible. Si falla, el
                        intento no se descuenta.
                      </p>
                    </div>
                  </Card>
                </div>
              ) : null}
              <div className="relative px-(--card-spacing)">
                <label className="sr-only" htmlFor="propuesta">
                  Propuesta editable
                </label>
                <textarea
                  id="propuesta"
                  value={text}
                  rows={6}
                  readOnly={isClosed || usesBackendApi || generating}
                  aria-busy={generating}
                  placeholder={
                    isDiscarded
                      ? "Barrera descartada."
                      : hasProposal
                        ? undefined
                        : usesBackendApi
                          ? "Generá una propuesta con IA."
                          : "Escribí tu adaptación o generá una propuesta con IA."
                  }
                  onChange={(event) => setText(event.target.value)}
                  onBlur={() => {
                    if (
                      !saved &&
                      !isDiscarded &&
                      !usesBackendApi &&
                      !generating
                    ) {
                      void persistDraft(text);
                    }
                  }}
                  className={cn(
                    "w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground transition-opacity duration-200 ease-out focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    (isClosed || usesBackendApi) &&
                      "cursor-default bg-muted text-foreground/90",
                    generating && "cursor-wait",
                    !textOpaque || generating ? "opacity-40" : "opacity-100",
                  )}
                />
              </div>
              {usesBackendApi && !isDiscarded ? (
                <p className="px-(--card-spacing) text-xs leading-5 text-muted-foreground">
                  La API actual no permite guardar cambios manuales en la
                  propuesta.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2 px-(--card-spacing) text-xs text-muted-foreground">
                <span>{meta}</span>
                {edited && !isClosed && !usesBackendApi ? (
                  <span className="font-medium text-info-foreground">
                    Cambios sin guardar
                  </span>
                ) : null}
                {saved ? <span>Propuesta aceptada</span> : null}
                {isDiscarded ? <span>Barrera descartada</span> : null}
              </div>
            </>
          )}

          {!isClosed && !generateError ? (
            <div className="space-y-3 px-(--card-spacing)">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {hasProposal || generating
                    ? "Pedir otra versión a la IA"
                    : "Generar propuesta con IA"}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    left === 0
                      ? "font-medium text-danger-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <IntentMeter
                    remaining={left}
                    total={AI_ATTEMPTS_PER_BARRIER}
                  />
                  {attemptsLabel}
                </span>
              </div>

              {!hasProposal && !generating ? (
                <>
                  <Button
                    type="button"
                    className="h-9 px-4"
                    disabled={left === 0}
                    onClick={() => void generateProposal()}
                  >
                    <Sparkles data-icon="inline-start" aria-hidden="true" />
                    Generar propuesta
                  </Button>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {usesBackendApi
                      ? `Generar la primera propuesta usa 1 de los ${AI_ATTEMPTS_PER_BARRIER} intentos de esta barrera.`
                      : `Generar la primera propuesta usa 1 de los ${AI_ATTEMPTS_PER_BARRIER} intentos de esta barrera. Editar a mano no consume intentos.`}
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
                        className={cn(
                          "h-8 rounded-full bg-white px-3",
                          pendingVariant === action.id &&
                            "border-primary bg-primary/15 text-foreground ring-2 ring-primary/40",
                        )}
                        disabled={left === 0 || generating}
                        aria-busy={pendingVariant === action.id}
                        onClick={() => void consume(action.id)}
                      >
                        {pendingVariant === action.id
                          ? "Generando…"
                          : action.label}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-8 rounded-full bg-white px-3",
                        pendingVariant === "otra" &&
                          "border-primary bg-primary/15 text-foreground ring-2 ring-primary/40",
                      )}
                      disabled={left === 0 || generating}
                      aria-busy={pendingVariant === "otra"}
                      onClick={() => void consume("otra")}
                    >
                      <RotateCcw
                        data-icon="inline-start"
                        aria-hidden="true"
                        className={cn(
                          pendingVariant === "otra" && "animate-spin",
                        )}
                      />
                      {pendingVariant === "otra"
                        ? "Generando…"
                        : "Otra versión"}
                    </Button>
                  </div>
                  {left === 0 ? (
                    <Card className="bg-warning-soft text-warning-foreground ring-1 ring-warning-foreground/20">
                      <div className="flex gap-3 px-(--card-spacing) py-3">
                        <Info
                          className="mt-0.5 size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <div className="space-y-1 text-sm leading-6">
                          <p className="font-semibold">
                            Usaste los {AI_ATTEMPTS_PER_BARRIER} intentos de
                            esta barrera
                          </p>
                          <p>
                            La IA ya no puede generar nuevas versiones. Todavía
                            podés editar el texto a mano y guardar, o descartar
                            la barrera.
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : generating ? null : (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Cada nueva versión usa 1 intento. Son{" "}
                      {AI_ATTEMPTS_PER_BARRIER} por barrera. Editar a mano o
                      restaurar no consume intentos.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : isClosed ? (
            <p className="px-(--card-spacing) text-xs leading-5 text-muted-foreground">
              Esta barrera está cerrada. Volvé a Adaptar o continuá con las
              pendientes.
            </p>
          ) : null}
        </Card>
      </div>

      {!isClosed ? (
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
      ) : null}

      <div className="flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-center lg:justify-between">
        {isDiscarded ? (
          <span className="text-sm text-muted-foreground">Descartada</span>
        ) : saved ? (
          <span className="text-sm text-muted-foreground">Aceptada</span>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-4"
            disabled={generating || actionPending != null}
            onClick={() => setConfirmDiscardOpen(true)}
          >
            {actionPending === "discard"
              ? hasProposal || suggestion.hasProposal
                ? "Rechazando…"
                : "Descartando…"
              : hasProposal || suggestion.hasProposal
                ? "Rechazar propuesta"
                : "Descartar barrera"}
          </Button>
        )}
        <p className="text-sm text-muted-foreground lg:flex-1 lg:px-4 lg:text-center">
          {footerHint}
        </p>
        {isClosed ? (
          <Button
            type="button"
            className="h-10 rounded-xl px-4 font-semibold"
            disabled={actionPending != null}
            onClick={() => advance()}
          >
            {allResolved || nextPendingIndex < 0
              ? "Obtener resultado"
              : lastInDimension
                ? "Volver a Adaptar"
                : "Continuar"}
          </Button>
        ) : (
          <Button
            type="button"
            className="h-10 rounded-xl px-4 font-semibold"
            disabled={
              generating ||
              actionPending != null ||
              (usesBackendApi
                ? !hasProposal
                : (!hasProposal && text.trim().length === 0) ||
                  Boolean(
                    generateError && !hasProposal && text.trim().length === 0,
                  ))
            }
            onClick={() => void saveAndAccept()}
          >
            {actionPending === "save"
              ? usesBackendApi
                ? "Aceptando…"
                : "Guardando…"
              : usesBackendApi
                ? lastInDimension
                  ? "Aceptar y volver a Adaptar"
                  : "Aceptar propuesta"
                : lastInDimension
                  ? "Guardar y volver a Adaptar"
                  : "Guardar y aceptar"}
          </Button>
        )}
      </div>

      <Dialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <DialogContent
          className="gap-5 rounded-2xl sm:max-w-md"
          showCloseButton={false}
        >
          <DialogHeader className="gap-2">
            <DialogTitle className="text-xl">
              {discardingProposal
                ? "¿Rechazar esta propuesta?"
                : "¿Descartar esta barrera?"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-muted-foreground">
              Esta acción es definitiva: no vas a poder retomarla ni generar
              otra propuesta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-4"
              disabled={actionPending === "discard"}
              onClick={() => setConfirmDiscardOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl px-4 font-semibold"
              disabled={actionPending === "discard"}
              onClick={() => void discardSuggestion()}
            >
              {actionPending === "discard"
                ? discardingProposal
                  ? "Rechazando…"
                  : "Descartando…"
                : discardingProposal
                  ? "Rechazar"
                  : "Descartar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BarrierPager({
  index,
  total,
  onPrevious,
  onNext,
}: {
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
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
        Anterior
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-9 px-3"
        disabled={index === total - 1}
        onClick={onNext}
      >
        Siguiente
      </Button>
    </div>
  );
}

function Observation({ barrier }: { barrier: ApiBarrier }) {
  return (
    <Card className="bg-muted/70 ring-1 ring-border/60">
      <div className="flex flex-wrap items-start justify-between gap-3 px-(--card-spacing)">
        <div className="flex items-center gap-2">
          <Pill tone="step">IA</Pill>
          <p className="font-medium">Observación de la IA</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Criterio: {barrier.criterion}
        </p>
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
  );
}

function ObservationColumn({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <p className="text-sm leading-6">{body}</p>
    </div>
  );
}

function priorityName(severity: Severity) {
  if (severity === "alta") return "Prioridad alta";
  if (severity === "media") return "Prioridad media";
  return "Prioridad baja";
}
