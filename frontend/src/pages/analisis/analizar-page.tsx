import { AnalysisChecklist } from "@/components/aula/analysis-checklist"
import { AnalysisFlowFooter } from "@/components/aula/analysis-flow-footer"
import { StepHeader } from "@/components/aula/step-header"

export function AnalizarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <StepHeader
        step="02"
        actor="Sistema · IA"
        title="Analizar material"
        description="El sistema escanea el material según las 6 dimensiones de accesibilidad. Proceso automático, sin intervención del docente."
      />
      <AnalysisChecklist />
      <AnalysisFlowFooter
        backHref="/analisis/cargar"
        nextHref="/analisis/revisar"
        nextLabel="Siguiente: Revisar"
      />
    </div>
  )
}
