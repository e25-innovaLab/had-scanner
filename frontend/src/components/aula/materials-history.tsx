"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import type { Material } from "@/lib/api/types";

function formatCreatedAt(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function MaterialsHistory({
  disabled = false,
  onUseMaterial,
  allowDelete = false,
  onDeleted,
}: {
  disabled?: boolean;
  onUseMaterial?: (material: Material) => void | Promise<void>;
  allowDelete?: boolean;
  onDeleted?: () => void;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingId, setUsingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.listMaterials();
        if (cancelled) return;
        const sorted = [...data.materials].sort((a, b) => {
          const ta = a.created_at ? Date.parse(a.created_at) : 0;
          const tb = b.created_at ? Date.parse(b.created_at) : 0;
          return tb - ta;
        });
        setMaterials(sorted);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el historial",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUse(material: Material) {
    if (!onUseMaterial || disabled || usingId != null || deletingId != null) {
      return;
    }
    setUsingId(material.id);
    try {
      await onUseMaterial(material);
    } finally {
      setUsingId(null);
    }
  }

  async function handleDelete(material: Material) {
    if (!allowDelete || disabled || deletingId != null || usingId != null) {
      return;
    }
    const confirmed = window.confirm(
      `¿Eliminar “${material.name}”? También se eliminarán sus PDF adaptados.`,
    );
    if (!confirmed) return;
    setDeletingId(material.id);
    setError(null);
    try {
      await api.deleteMaterial(material.id);
      setMaterials((current) =>
        current.filter((item) => item.id !== material.id),
      );
      onDeleted?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el material.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Historial de materiales
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          PDFs ya cargados. Podés analizarlos de nuevo sin volver a subirlos.
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
        {!loading && !error && materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay materiales cargados.
          </p>
        ) : null}
        {!loading && materials.length > 0 ? (
          <ul className="divide-y divide-border">
            {materials.map((material) => (
              <li
                key={material.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{material.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Id {material.id} · {formatCreatedAt(material.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {allowDelete ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        disabled || deletingId != null || usingId != null
                      }
                      onClick={() => void handleDelete(material)}
                    >
                      {deletingId === material.id ? "Eliminando…" : "Eliminar"}
                    </Button>
                  ) : null}
                  {onUseMaterial ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        disabled || usingId != null || deletingId != null
                      }
                      onClick={() => void handleUse(material)}
                    >
                      {usingId === material.id
                        ? "Iniciando…"
                        : "Analizar de nuevo"}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
