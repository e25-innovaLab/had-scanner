"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { resolveAnalysisId, writeFlowResume } from "@/lib/api/url"

/** Persiste en localStorage el último paso del flujo con su analysisId. */
export function FlowResumeTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const analysisId = resolveAnalysisId(searchParams.get("analysisId"))
    if (!analysisId) return
    if (!pathname.startsWith("/analisis/")) return
    writeFlowResume(analysisId, pathname)
  }, [pathname, searchParams])

  return null
}
