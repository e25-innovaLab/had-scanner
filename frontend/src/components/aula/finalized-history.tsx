"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import type { FinalizedDocument } from "@/lib/api/types";

function formatCreatedAt(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function FinalizedHistory({
  disabled = false,
  refreshKey = 0,
}: {
  disabled?: boolean;
  refreshKey?: number;
}) {
  const [documents, setDocuments] = useState<FinalizedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const docs = await api.listAllFinalizedDocuments();
        if (cancelled) return;
        setDocuments(Array.isArray(docs) ? docs : []);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el historial de adaptados",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function handleDownload(doc: FinalizedDocument) {
    if (disabled || downloadingId != null || deletingId != null) return;
    setDownloadingId(doc.id);
    setError(null);
    try {
      const href = api.finalizedDownloadHref(doc.download_url);
      const res = await fetch(href);
      if (!res.ok) {
        let message =
          "No se pudo descargar el PDF. Puede haber expirado o no estar disponible.";
        try {
          const data: unknown = await res.json();
          if (
            data &&
            typeof data === "object" &&
            "detail" in data &&
            typeof (data as { detail: unknown }).detail === "string"
          ) {
            message = (data as { detail: string }).detail;
          }
        } catch {
          // Keep fallback message when the body is not JSON.
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = doc.filename || "material-adaptado.pdf";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo descargar el material adaptado.",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(doc: FinalizedDocument) {
    if (disabled || deletingId != null || doc.material_id == null) return;
    const label = doc.filename || "este PDF";
    const confirmed = window.confirm(
      `¿Quitar “${label}” del historial? Dejará de mostrarse; el archivo queda en el servidor hasta la retención automática o una limpieza en Supabase.`,
    );
    if (!confirmed) return;
    setDeletingId(doc.id);
    setError(null);
    try {
      await api.deleteFinalizedDocument(doc.material_id, doc.id);
      setDocuments((current) => current.filter((item) => item.id !== doc.id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el material adaptado.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Materiales adaptados
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          PDFs generados al finalizar el flujo, ordenados por fecha. El
          servidor puede borrarlos automáticamente cuando superan el plazo
          de retención configurado.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando historial…</p>
        ) : null}
        {error ? (
          <p className="text-sm text-danger-foreground" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay materiales adaptados. Cuando generes un PDF en
            “Obtener resultado”, va a aparecer acá para volver a descargarlo.
          </p>
        ) : null}
        {!loading && documents.length > 0 ? (
          <ul className="divide-y divide-border">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.material_name
                      ? `${doc.material_name} · `
                      : ""}
                    {formatCreatedAt(doc.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      disabled || deletingId != null || downloadingId != null
                    }
                    onClick={() => void handleDownload(doc)}
                  >
                    {downloadingId === doc.id ? "Descargando…" : "Descargar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      disabled ||
                      deletingId != null ||
                      downloadingId != null ||
                      doc.material_id == null
                    }
                    onClick={() => void handleDelete(doc)}
                  >
                    {deletingId === doc.id ? "Eliminando…" : "Eliminar"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
