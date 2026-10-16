"use client"

import { useCallback, useState } from "react"
import {
  AdaptBoard,
  type AdaptCounts,
} from "@/components/aula/adapt-board"
import { AnalysisFlowFooter } from "@/components/aula/analysis-flow-footer"

export function AdaptarStep() {
  const [counts, setCounts] = useState<AdaptCounts>({
    accepted: 0,
    discarded: 0,
    pending: 0,
    total: 0,
  })

  const onCountsChange = useCallback((next: AdaptCounts) => {
    setCounts(next)
  }, [])

  const allResolved = counts.total > 0 && counts.pending === 0

  return (
    <>
      <AdaptBoard onCountsChange={onCountsChange} />
      <AnalysisFlowFooter
        backHref="/analisis/revisar"
        nextHref={allResolved ? "/analisis/resultado" : "/analisis/detalle"}
        nextLabel={
          allResolved
            ? "Siguiente: Obtener resultado"
            : "Siguiente: Detalle y edición"
        }
      />
    </>
  )
}
