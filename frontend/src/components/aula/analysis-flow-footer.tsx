"use client"

import { useSearchParams } from "next/navigation"
import { FlowFooter } from "@/components/aula/flow-footer"
import { resolveAnalysisId, withAnalysisId } from "@/lib/api/url"

export function AnalysisFlowFooter({
  backHref,
  backLabel,
  nextHref,
  nextLabel,
}: {
  backHref: string
  backLabel?: string
  nextHref: string
  nextLabel: string
}) {
  const searchParams = useSearchParams()
  const analysisId = resolveAnalysisId(searchParams.get("analysisId"))

  return (
    <FlowFooter
      backHref={withAnalysisId(backHref, analysisId)}
      backLabel={backLabel}
      nextHref={withAnalysisId(nextHref, analysisId)}
      nextLabel={nextLabel}
    />
  )
}
