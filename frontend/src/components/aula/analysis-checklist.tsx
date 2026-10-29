"use client";

import { useEffect, useState } from "react";
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
  resolveAnalysisId,
  storeAnalysisId,
  withAnalysisId,
  writeFlowResume,
} from "@/lib/api/url";
import { waitForBackendAnalysis } from "@/lib/api/wait-for-backend-analysis";
import { cn } from "@/lib/utils";

export type AnalysisUiStatus = "analyzing" | "ready" | "failed";

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
  if (failed) {
    return PIPELINE.map((p) => ({
      id: p.id,
      label: p.label,
      status: "error" as const,
    }));
  }

  const idx = PIPELINE.findIndex((p) => p.id === step);
  const active = idx >= 0 ? idx : step === "completed" ? PIPELINE.length : 0;

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

export function AnalysisChecklist({
  onStatusChange,
}: {
  onStatusChange?: (status: AnalysisUiStatus) => void;
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

  useEffect(() => {
    if (!analysisId) return;
    setStatus("analyzing");
    onStatusChange?.("analyzing");
  }, [analysisId, onStatusChange]);

  useEffect(() => {
    if (!analysisId || status !== "analyzing") return;
    setElapsedSec(0);
    const id = window.setInterval(() => {
      setElapsedSec((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [analysisId, status]);

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    let timer: number | undefined;

    function applyStatus(next: AnalysisUiStatus) {
      setStatus(next);
      onStatusChange?.(next);
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
              const nextStatus: AnalysisUiStatus =
                a.status === "completed"
                  ? "ready"
                  : a.status === "failed"
                    ? "failed"
                    : "analyzing";
              applyStatus(nextStatus);
              setRows(rowsFromStep(a.current_step, a.status === "failed"));
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
        const nextStatus: AnalysisUiStatus =
          data.status === "ready"
            ? "ready"
            : data.status === "failed"
              ? "failed"
              : "analyzing";
        applyStatus(nextStatus);
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
        err instanceof Error
          ? err.message
          : "No se pudo reiniciar el análisis",
      );
      setRetrying(false);
    }
  }

  if (!analysisId) {
    return <MissingAnalysis step="analizar el material" />;
  }

  return (
    <div className="space-y-4">
      <Card className="flex-row items-center justify-between gap-3 px-(--card-spacing) py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="size-8 shrink-0 rounded-md bg-secondary"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {fileSize ? formatSize(fileSize) : "—"}
              {` · ${formatElapsed(elapsedSec)}`}
            </p>
          </div>
        </div>
        <Pill tone="muted">
          {status === "ready"
            ? "Listo"
            : status === "failed"
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

      {error ? (
        <p className="text-sm text-danger-foreground" role="alert">
          {error}
        </p>
      ) : null}

      {status === "failed" ? (
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

      <Card>
        <CardContent className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
            >
              <StatusIcon status={row.status} />
              <span
                className={cn(
                  row.status === "pending" && "text-muted-foreground",
                )}
              >
                {row.label}
              </span>
              {row.status === "running" ? (
                <span className="text-muted-foreground">analizando...</span>
              ) : null}
              {row.status === "error" ? (
                <span className="text-danger-foreground">
                  no se pudo analizar
                </span>
              ) : null}
            </div>
          ))}
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
