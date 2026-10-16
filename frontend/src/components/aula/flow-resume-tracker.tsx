"use client"

import { useEffect } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { resolveAnalysisId, writeFlowResume } from "@/lib/api/url"

/** Persiste en localStorage el último paso del flujo con su analysisId. */
export function FlowResumeTracker() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const analysisId = resolveAnalysisId(searchParams.get("analysisId"))
    if (!analysisId) return
    if (!pathname.startsWith("/analisis/")) return
    writeFlowResume(analysisId, pathname)
  }, [pathname, searchParams])

  return null
}
