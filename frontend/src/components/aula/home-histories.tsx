"use client";

import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FinalizedHistory } from "@/components/aula/finalized-history";
import { MaterialsHistory } from "@/components/aula/materials-history";
import { api } from "@/lib/api/client";
import type { Material } from "@/lib/api/types";
import {
  storeAnalysisId,
  withAnalysisId,
  writeFlowResume,
} from "@/lib/api/url";

export function HomeHistories({
  backendReady,
}: {
  backendReady: boolean | null;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalizedRefreshKey, setFinalizedRefreshKey] = useState(0);

  async function analyzeExistingMaterial(material: Material) {
    if (busy || backendReady !== true) return;
    setBusy(true);
    setError(null);
    try {
      const pending = await api.analyzeMaterial(material.id);
      const id = String(pending.analysis_id);
      storeAnalysisId(id);
      writeFlowResume(id, "/analisis/analizar");
      navigate(withAnalysisId("/analisis/analizar", id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar el análisis del material",
      );
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2" aria-label="Historiales">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Tus archivos
        </h2>
        <p className="text-sm text-muted-foreground">
          Materiales subidos y PDF adaptados guardados en el servidor, ordenados
          por fecha. Podés eliminarlos cuando ya no los necesites.
        </p>
      </header>
      {backendReady === null ? (
        <p className="text-sm text-muted-foreground">
          Esperando conexión con Vera para cargar el historial…
        </p>
      ) : null}
      {backendReady === false ? (
        <p className="text-sm text-muted-foreground">
          El historial no está disponible porque Vera no responde.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-danger-foreground" role="alert">
          {error}
        </p>
      ) : null}
      {backendReady === true ? (
        <>
          <MaterialsHistory
            disabled={busy}
            allowDelete
            onUseMaterial={analyzeExistingMaterial}
            onDeleted={() => setFinalizedRefreshKey((value) => value + 1)}
          />
          <FinalizedHistory disabled={busy} refreshKey={finalizedRefreshKey} />
        </>
      ) : null}
    </section>
  );
}
