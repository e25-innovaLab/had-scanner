"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, Circle, CircleAlert } from "lucide-react"
import { MissingAnalysis } from "@/components/aula/missing-analysis"
import { Pill } from "@/components/aula/pill"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api/client"
import type { DimensionProgressStatus } from "@/lib/api/types"
import { resolveAnalysisId } from "@/lib/api/url"
import { cn } from "@/lib/utils"

type Row = {
  id: string
  label: string
  status: DimensionProgressStatus
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AnalysisChecklist() {
  const searchParams = useSearchParams()
  const analysisId = resolveAnalysisId(searchParams.get("analysisId"))
  const [rows, setRows] = useState<Row[]>([])
  const [fileName, setFileName] = useState("Material")
  const [fileSize, setFileSize] = useState(0)
  const [status, setStatus] = useState<string>("analyzing")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!analysisId) return
    let cancelled = false
    let timer: number | undefined

    async function poll() {
      try {
        const data = await api.getStatus(analysisId!)
        if (cancelled) return
        setRows(data.dimensionProgress)
        setFileName(data.originalFileName)
        setFileSize(data.originalFileSize)
        setStatus(data.status)
        setError(null)
        // Listo: dejamos de pollar. El docente avanza con "Siguiente: Revisar".
        if (data.status === "ready" || data.status === "failed") return
        timer = window.setTimeout(() => void poll(), 700)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Error al consultar estado")
        timer = window.setTimeout(() => void poll(), 1500)
      }
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [analysisId])

  if (!analysisId) {
    return <MissingAnalysis step="analizar el material" />
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
            </p>
          </div>
        </div>
        <Pill tone="muted">
          {status === "ready" ? "Listo" : "Analizando..."}
        </Pill>
      </Card>

      {error ? (
        <p className="text-sm text-danger-foreground" role="alert">
          {error}
        </p>
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
                  row.status === "pending" && "text-muted-foreground"
                )}
              >
                {row.label}
              </span>
              {row.status === "running" ? (
                <span className="text-muted-foreground">analizando...</span>
              ) : null}
              {row.status === "error" ? (
                <span className="text-danger-foreground">
                  no se pudo analizar —{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto px-0 text-danger-foreground underline"
                    onClick={() =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, status: "done" }
                            : item
                        )
                      )
                    }
                  >
                    reintentar
                  </Button>
                </span>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusIcon({ status }: { status: DimensionProgressStatus }) {
  if (status === "done") {
    return (
      <Check
        className="size-4 text-success-foreground"
        aria-hidden="true"
      />
    )
  }
  if (status === "error") {
    return (
      <CircleAlert
        className="size-4 text-danger-foreground"
        aria-hidden="true"
      />
    )
  }
  if (status === "running") {
    return <span className="px-0.5 text-muted-foreground">...</span>
  }
  return <Circle className="size-4 text-muted-foreground" aria-hidden="true" />
}
