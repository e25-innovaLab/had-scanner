import type { Metadata } from "next"
import { Suspense } from "react"
import { AnalysisChecklist } from "@/components/aula/analysis-checklist"
import { AnalysisFlowFooter } from "@/components/aula/analysis-flow-footer"
import { StepHeader } from "@/components/aula/step-header"

export const metadata: Metadata = {
  title: "Analizar material",
}

export default function AnalizarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <StepHeader
        step="02"
        actor="Sistema · IA"
        title="Analizar material"
        description="El sistema escanea el material según las 6 dimensiones de accesibilidad. Proceso automático, sin intervención del docente."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando análisis...</p>}>
        <AnalysisChecklist />
      </Suspense>
      <Suspense fallback={null}>
        <AnalysisFlowFooter
          backHref="/analisis/cargar"
          nextHref="/analisis/revisar"
          nextLabel="Siguiente: Revisar"
        />
      </Suspense>
    </div>
  )
}
