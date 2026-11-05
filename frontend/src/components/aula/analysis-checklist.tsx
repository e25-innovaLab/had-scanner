"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Circle, CircleAlert } from "lucide-react";
import { MissingAnalysis } from "@/components/aula/missing-analysis";
import { Pill } from "@/components/aula/pill";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import type { DimensionProgressStatus } from "@/lib/api/types";
import { isBackendId } from "@/lib/api/ids";
import {
  elapsedSecondsForAnalysis,
  ensureAnalysisStartedAt,
  markAnalysisEnded,
  readAnalysisEndedAt,
} from "@/lib/api/analysis-elapsed";
import {
  resolveAnalysisId,
  storeAnalysisId,
  withAnalysisId,
  writeFlowResume,
} from "@/lib/api/url";
import { waitForBackendAnalysis } from "@/lib/api/wait-for-backend-analysis";
import { cn } from "@/lib/utils";

export type AnalysisUiStatus = "analyzing" | "ready" | "failed" | "incomplete";

type Row = {
  id: string;
  label: string;
  status: DimensionProgressStatus;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatElapsed(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const PIPELINE = [
  { id: "queued", label: "En cola" },
  { id: "parsing", label: "Leyendo el PDF" },
  { id: "accessibility_analysis", label: "Analizando accesibilidad (IA)" },
  { id: "associating_evidence", label: "Asociando evidencias" },
  { id: "persisting_results", label: "Guardando resultados" },
] as const;

function rowsFromStep(step: string, failed: boolean): Row[] {
  const idx = PIPELINE.findIndex((p) => p.id === step);
  const active = idx >= 0 ? idx : step === "completed" ? PIPELINE.length : 0;

  if (failed) {
    return PIPELINE.map((p, i) => ({
      id: p.id,
      label: p.label,
      status:
        i < active
          ? ("done" as const)
          : i === active
            ? ("error" as const)
            : ("pending" as const),
    }));
  }

  return PIPELINE.map((p, i) => ({
    id: p.id,
    label: p.label,
    status:
      step === "completed" || i < active
        ? ("done" as const)
        : i === active
          ? ("running" as const)
          : ("pending" as const),
  }));
}

function resolveUiStatus(
  rows: Row[],
  base: "analyzing" | "ready" | "failed",
): AnalysisUiStatus {
  if (base !== "failed") return base;
  const done = rows.filter((row) => row.status === "done").length;
  const errors = rows.filter((row) => row.status === "error").length;
  if (done > 0 && errors > 0) return "incomplete";
  return "failed";
}

export type AnalysisChecklistSummary = {
  status: AnalysisUiStatus;
  doneCount: number;
  totalCount: number;
};

export function AnalysisChecklist({
  onStatusChange,
}: {
  onStatusChange?: (summary: AnalysisChecklistSummary) => void;
} = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analysisId = resolveAnalysisId(searchParams.get("analysisId"));
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("Material");
  const [fileSize, setFileSize] = useState(0);
  const [status, setStatus] = useState<AnalysisUiStatus>("analyzing");
  const [error, setError] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const doneCount = useMemo(
    () => rows.filter((row) => row.status === "done").length,
    [rows],
  );
  const errorRows = useMemo(
    () => rows.filter((row) => row.status === "error"),
    [rows],
  );
  const totalCount = rows.length;
  const failedLabels = errorRows.map((row) => row.label).join(", ");

  const [activeAnalysisId, setActiveAnalysisId] = useState(analysisId);

  if (analysisId !== activeAnalysisId) {
    setActiveAnalysisId(analysisId);
    setStatus("analyzing");
    setRows([]);
    setError(null);
    setMaterialId(null);
    setElapsedSec(0);
    setFileName("Material");
    setFileSize(0);
    setRetrying(false);
  }

  const isFinished =
    status === "ready" || status === "failed" || status === "incomplete";

  const displayElapsedSec =
    analysisId && (isFinished || readAnalysisEndedAt(analysisId) != null)
      ? elapsedSecondsForAnalysis(analysisId)
      : elapsedSec;

  useEffect(() => {
    if (!analysisId || status !== "analyzing") return;
    if (readAnalysisEndedAt(analysisId) != null) return;

    const startedAt = ensureAnalysisStartedAt(analysisId);
    const id = window.setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [analysisId, status]);

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    let timer: number | undefined;

    function applyStatus(next: AnalysisUiStatus, nextRows: Row[]) {
      if (next === "ready" || next === "failed" || next === "incomplete") {
        markAnalysisEnded(analysisId!);
      }
      setStatus(next);
      onStatusChange?.({
        status: next,
        doneCount: nextRows.filter((row) => row.status === "done").length,
        totalCount: nextRows.length,
      });
    }

    async function poll() {
      try {
        if (isBackendId(analysisId!)) {
          await waitForBackendAnalysis(Number(analysisId), {
            onStep: (a) => {
              if (cancelled) return;
              setMaterialId(a.material_id);
              setFileName(`material-${a.material_id}.pdf`);
              setFileSize(0);
              const nextRows = rowsFromStep(
                a.current_step,
                a.status === "failed",
              );
              setRows(nextRows);
              const base =
                a.status === "completed"
                  ? "ready"
                  : a.status === "failed"
                    ? "failed"
                    : "analyzing";
              applyStatus(resolveUiStatus(nextRows, base), nextRows);
              setError(
                a.status === "failed"
                  ? (a.error_message ?? "No se pudo completar el análisis")
                  : null,
              );
            },
          });
          return;
        }

        const data = await api.getStatus(analysisId!);
        if (cancelled) return;
        setRows(data.dimensionProgress);
        setFileName(data.originalFileName);
        setFileSize(data.originalFileSize);
        const base =
          data.status === "ready"
            ? "ready"
            : data.status === "failed"
              ? "failed"
              : "analyzing";
        applyStatus(
          resolveUiStatus(data.dimensionProgress, base),
          data.dimensionProgress,
        );
        setError(null);
        if (data.status === "ready" || data.status === "failed") return;
        timer = window.setTimeout(() => void poll(), 700);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Error al consultar estado",
        );
        timer = window.setTimeout(() => void poll(), 1500);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [analysisId, onStatusChange]);

  async function retryAnalysis() {
    if (materialId == null || retrying) return;
    setRetrying(true);
    setError(null);
    try {
      const pending = await api.analyzeMaterial(materialId);
      const id = String(pending.analysis_id);
      storeAnalysisId(id);
      writeFlowResume(id, "/analisis/analizar");
      navigate(withAnalysisId("/analisis/analizar", id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo reiniciar el análisis",
      );
      setRetrying(false);
    }
  }

  if (!analysisId) {
    return <MissingAnalysis step="analizar el material" />;
  }

  const incomplete = status === "incomplete";
  const failed = status === "failed";

  return (
    <div className="space-y-4">
      <Card className="flex-row items-center justify-between gap-3 px-(--card-spacing) py-3 shadow-sm ring-1 ring-border/70">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/25 text-xs font-semibold text-foreground"
            aria-hidden="true"
          >
            PDF
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {fileSize ? formatSize(fileSize) : "—"}
              {` · ${formatElapsed(displayElapsedSec)}`}
            </p>
          </div>
        </div>
        <Pill
          tone={
            status === "ready"
              ? "ok"
              : incomplete
                ? "warn"
                : failed
                  ? "alta"
                  : "step"
          }
        >
          {status === "ready"
            ? "Listo"
            : incomplete
              ? "Análisis incompleto"
              : failed
                ? "Falló"
                : "Analizando..."}
        </Pill>
      </Card>

      {status === "analyzing" ? (
        <p className="text-sm text-muted-foreground">
          Este paso puede demorar varios minutos (análisis con IA). No hace
          falta recargar la página.
        </p>
      ) : null}

      {incomplete ? (
        <Card className="border-warning-foreground/20 bg-warning-soft text-warning-foreground shadow-none">
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-semibold">
              No pudimos analizar {errorRows.length} de las {totalCount}{" "}
              dimensiones
            </p>
            <p className="text-sm leading-6">
              Podés reintentar {failedLabels || "las dimensiones fallidas"} o
              continuar con las {doneCount} dimensiones analizadas. Si
              continuás, el diagnóstico y el informe van a indicar que{" "}
              {failedLabels || "esas dimensiones"}{" "}
              {errorRows.length === 1 ? "quedó" : "quedaron"} sin analizar.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {failed && !incomplete && error ? (
        <Card className="border-danger-foreground/20 bg-danger-soft text-danger-foreground shadow-none">
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-semibold">
              No se pudo completar el análisis
            </p>
            <p className="text-sm leading-6">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {failed || incomplete ? (
        <div className="flex flex-wrap gap-2">
          {materialId != null ? (
            <Button
              type="button"
              size="sm"
              disabled={retrying}
              onClick={() => void retryAnalysis()}
            >
              {retrying ? "Reiniciando…" : "Analizar de nuevo"}
            </Button>
          ) : null}
          <Link
            to={withAnalysisId("/analisis/cargar", analysisId)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Volver a Cargar
          </Link>
        </div>
      ) : null}

      <Card className="shadow-sm ring-1 ring-border/70">
        <CardContent className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
            >
              <StatusIcon status={row.status} />
              <span
                className={cn(
                  "min-w-0 flex-1",
                  row.status === "pending" && "text-muted-foreground",
                )}
              >
                {row.label}
              </span>
              {row.status === "running" ? (
                <span className="text-muted-foreground">analizando...</span>
              ) : null}
              {row.status === "error" ? (
                <>
                  <span className="text-danger-foreground">
                    No se pudo analizar
                  </span>
                  {materialId != null ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-3"
                      disabled={retrying}
                      onClick={() => void retryAnalysis()}
                    >
                      {retrying ? "Reiniciando…" : "Reintentar"}
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          ))}
          {(incomplete || status === "ready") && totalCount > 0 ? (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-sm text-muted-foreground">
                {doneCount} de {totalCount} dimensiones analizadas
              </p>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-valuenow={doneCount}
                aria-valuemin={0}
                aria-valuemax={totalCount}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{
                    width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ status }: { status: DimensionProgressStatus }) {
  if (status === "done") {
    return (
      <Check className="size-4 text-success-foreground" aria-hidden="true" />
    );
  }
  if (status === "error") {
    return (
      <CircleAlert
        className="size-4 text-danger-foreground"
        aria-hidden="true"
      />
    );
  }
  if (status === "running") {
    return <span className="px-0.5 text-muted-foreground">...</span>;
  }
  return <Circle className="size-4 text-muted-foreground" aria-hidden="true" />;
}
