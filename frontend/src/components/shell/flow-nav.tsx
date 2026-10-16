"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Check } from "lucide-react"
import { SideNav } from "@/components/shell/side-nav"
import { resolveAnalysisId, withAnalysisId } from "@/lib/api/url"
import { FLOW_STEPS } from "@/lib/aula"
import { cn } from "@/lib/utils"

export function FlowNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const analysisId = resolveAnalysisId(searchParams.get("analysisId"))
  const currentIndex = Math.max(
    0,
    FLOW_STEPS.findIndex((step) => pathname === step.href || pathname.startsWith(`${step.href}/`))
  )

  return (
    <SideNav label="Pasos del análisis">
      {FLOW_STEPS.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming"
        const number = String(index + 1).padStart(2, "0")
        return (
          <Link
            key={step.href}
            href={withAnalysisId(step.href, analysisId)}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
              state === "current"
                ? "bg-info font-medium text-info-foreground"
                : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
            )}
          >
            {state === "done" ? (
              <Check className="size-4 text-success-foreground" aria-hidden="true" />
            ) : (
              <span className="w-5 text-xs tabular-nums">{number}</span>
            )}
            {step.label}
          </Link>
        )
      })}
    </SideNav>
  )
}
