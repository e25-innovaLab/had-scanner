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

  function handleDownload(doc: FinalizedDocument) {
    const href = api.finalizedDownloadHref(doc.download_url);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(doc: FinalizedDocument) {
    if (disabled || deletingId != null || doc.material_id == null) return;
    const label = doc.filename || "este PDF";
    const confirmed = window.confirm(
      `¿Eliminar “${label}”? No se podrá volver a descargar.`,
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
          PDFs generados al finalizar el flujo. Podés volver a descargarlos o
          eliminarlos.
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
            Todavía no hay materiales adaptados.
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
                    disabled={disabled || deletingId != null}
                    onClick={() => handleDownload(doc)}
                  >
                    Descargar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      disabled ||
                      deletingId != null ||
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
