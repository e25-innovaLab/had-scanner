"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { MissingAnalysis } from "@/components/aula/missing-analysis"
import { Pill } from "@/components/aula/pill"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api/client"
import type { BarrierGroupDto } from "@/lib/api/types"
import { resolveAnalysisId } from "@/lib/api/url"
import { cn } from "@/lib/utils"

const severityTone = {
  alta: "alta",
  media: "media",
  baja: "baja",
  ninguna: "ok",
} as const

const severityLabel = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
  ninguna: "Sin barreras",
} as const

export function BarrierList({
  onStats,
}: {
  onStats?: (stats: {
    total: number
    highSeverity: number
    dimensionsAffected: number
    dimensionsTotal: number
  }) => void
} = {}) {
  const [searchParams] = useSearchParams()
  const analysisId = resolveAnalysisId(searchParams.get("analysisId"))
  const [groups, setGroups] = useState<BarrierGroupDto[]>([])
  const [openId, setOpenId] = useState<string>("comprension")
  const [pages, setPages] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!analysisId) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const data = await api.listBarriers(analysisId)
        if (cancelled) return
        setGroups(data.groups)
        onStats?.(data.stats)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar barreras")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [analysisId, onStats])

  if (!analysisId) {
    return <MissingAnalysis step="revisar barreras" />
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando barreras...</p>
  }

  if (error) {
    return (
      <p className="text-sm text-danger-foreground" role="alert">
        {error}
      </p>
    )
  }

  return (
    <Card className="gap-0 py-0">
      {groups.map((group) => {
        const open = openId === group.id
        const page = pages[group.id] ?? 0
        return (
          <section key={group.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-4 text-left"
              aria-expanded={open}
              onClick={() => setOpenId(open ? "" : group.id)}
            >
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180"
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 text-sm font-medium">{group.name}</span>
              <span className="flex flex-wrap items-center justify-end gap-2">
                {group.items.length > 0 ? (
                  <Pill tone="role">
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "barrera" : "barreras"}
                  </Pill>
                ) : null}
                <Pill tone={severityTone[group.severity]}>
                  {severityLabel[group.severity]}
                </Pill>
                {group.severity === "ninguna" ? <Pill tone="muted">–</Pill> : null}
              </span>
            </button>
            {open ? (
              <BarrierBody
                group={group}
                page={Math.min(page, Math.max(0, group.items.length - 1))}
                onPageChange={(next) =>
                  setPages((prev) => ({ ...prev, [group.id]: next }))
                }
              />
            ) : null}
          </section>
        )
      })}
    </Card>
  )
}

function BarrierBody({
  group,
  page,
  onPageChange,
}: {
  group: BarrierGroupDto
  page: number
  onPageChange: (page: number) => void
}) {
  if (group.items.length === 0) {
    return (
      <div className="px-4 pb-4 text-sm text-muted-foreground">
        No se detectaron barreras en esta dimensión.
      </div>
    )
  }

  const item = group.items[page]
  const total = group.items.length

  return (
    <div className="space-y-3 px-4 pb-4">
      {total > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Barrera {page + 1} de {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 0}
              aria-label="Barrera anterior"
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft aria-hidden="true" />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= total - 1}
              aria-label="Barrera siguiente"
              onClick={() => onPageChange(page + 1)}
            >
              Siguiente
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{item.title}</h3>
        <p className="text-sm leading-6">
          <span className="text-muted-foreground">¿Por qué es barrera? </span>
          {item.why}
        </p>
        <p className="text-sm leading-6">
          <span className="text-muted-foreground">Dónde está: </span>
          {item.where}
        </p>
        <p className="text-sm leading-6">
          <span className="text-muted-foreground">Recomendación: </span>
          {item.recommendation}
        </p>
      </div>
    </div>
  )
}
