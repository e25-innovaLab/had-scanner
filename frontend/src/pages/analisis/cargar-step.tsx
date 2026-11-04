"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { MaterialsHistory } from "@/components/aula/materials-history";
import { UploadPanel } from "@/components/aula/upload-panel";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { api, ApiError } from "@/lib/api/client";
import type { Material } from "@/lib/api/types";
import {
  storeAnalysisId,
  withAnalysisId,
  writeFlowResume,
} from "@/lib/api/url";
import {
  readVeraSource,
  VERA_SOURCE,
  type VeraSource,
} from "@/lib/api/vera-source";
import { cn } from "@/lib/utils";

function findMaterialByFileName(
  materials: Material[],
  fileName: string,
): Material | undefined {
  const target = fileName.trim().toLowerCase();
  const exact = materials.find((m) => m.name.toLowerCase() === target);
  if (exact) return exact;

  const stem = target.replace(/\.pdf$/i, "");
  return materials.find((m) => {
    const name = m.name.toLowerCase();
    return name === `${stem}.pdf` || name.startsWith(`${stem} `);
  });
}

export function CargarStep() {
  const navigate = useNavigate();
  const [source] = useState<VeraSource>(
    () => readVeraSource() ?? VERA_SOURCE.mock,
  );
  const useRealApi = source === VERA_SOURCE.api;

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"archivo" | "texto">("archivo");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [duplicateMaterial, setDuplicateMaterial] = useState<Material | null>(
    null,
  );

  const canContinue =
    mode === "archivo" ? Boolean(file) : text.trim().length > 0;

  async function startAnalysisForMaterial(materialId: number) {
    setStatusLabel("Iniciando análisis…");
    const pending = await api.analyzeMaterial(materialId);
    const id = String(pending.analysis_id);
    storeAnalysisId(id);
    writeFlowResume(id, "/analisis/analizar");
    navigate(withAnalysisId("/analisis/analizar", id));
  }

  async function useExistingMaterial(material: Material) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setDuplicateMaterial(null);
    setStatusLabel(null);
    try {
      await startAnalysisForMaterial(material.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar el análisis del material",
      );
      setSubmitting(false);
      setStatusLabel(null);
    }
  }

  async function continueWithMock() {
    setStatusLabel("Creando análisis (demo)…");
    const analysis = await api.createAnalysis(
      mode === "archivo" && file
        ? { fileName: file.name, fileSize: file.size }
        : {
            fileName: "CARPINTERIA I (TECNO DE MAT).txt",
            fileSize: new TextEncoder().encode(text).length,
          },
    );
    storeAnalysisId(analysis.id);
    writeFlowResume(analysis.id, "/analisis/analizar");
    navigate(withAnalysisId("/analisis/analizar", analysis.id));
  }

  async function continueToAnalyze() {
    if (!canContinue || submitting) return;
    setSubmitting(true);
    setError(null);
    setStatusLabel(null);
    setDuplicateMaterial(null);

    try {
      if (!useRealApi) {
        await continueWithMock();
        return;
      }

      const isPdf =
        mode === "archivo" && file && file.name.toLowerCase().endsWith(".pdf");

      if (isPdf && file) {
        setStatusLabel("Subiendo PDF…");
        try {
          const material = await api.uploadMaterial(file);
          await startAnalysisForMaterial(material.id);
          return;
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            const { materials } = await api.listMaterials();
            const match = findMaterialByFileName(materials, file.name);
            setDuplicateMaterial(match ?? null);
            setError(
              match
                ? "Este PDF ya está cargado. Podés analizarlo de nuevo con el botón de abajo o desde el historial."
                : "Este PDF ya está cargado. Elegilo en el historial de abajo para analizarlo de nuevo.",
            );
            setSubmitting(false);
            setStatusLabel(null);
            return;
          }
          throw err;
        }
      }

      setError(
        "En el camino API real hace falta un PDF. Para texto u otros formatos, volvé al inicio y elegí Demo (mock).",
      );
      setSubmitting(false);
      setStatusLabel(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear el análisis",
      );
      setSubmitting(false);
      setStatusLabel(null);
    }
  }

  return (
    <>
      <UploadPanel
        onSelectionChange={({
          file: nextFile,
          text: nextText,
          mode: nextMode,
        }) => {
          setFile(nextFile);
          setText(nextText);
          setMode(nextMode);
          setError(null);
          setDuplicateMaterial(null);
        }}
      />
      {useRealApi ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Camino API real: usá un PDF. El historial reutiliza materiales ya
          subidos.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Camino demo: archivo o texto contra la API simulada.
        </p>
      )}
      {error ? (
        <div className="mt-3 space-y-2" role="alert">
          <p className="text-sm text-danger-foreground">{error}</p>
          {duplicateMaterial ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => void useExistingMaterial(duplicateMaterial)}
            >
              Analizar “{duplicateMaterial.name}” de nuevo
            </Button>
          ) : null}
        </div>
      ) : null}

      {useRealApi ? (
        <MaterialsHistory
          disabled={submitting}
          onUseMaterial={useExistingMaterial}
        />
      ) : null}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-10 px-4",
          )}
        >
          Volver al inicio
        </Link>
        <Button
          type="button"
          size="lg"
          className="h-10 px-4"
          disabled={!canContinue || submitting}
          onClick={() => void continueToAnalyze()}
        >
          {submitting
            ? (statusLabel ?? "Subiendo material…")
            : "Siguiente: Analizar"}
        </Button>
      </div>
    </>
  );
}
