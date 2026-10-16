import { StepHeader } from "@/components/aula/step-header"
import { RevisarStep } from "@/pages/analisis/revisar-step"

export function RevisarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <StepHeader
        step="03"
        actor="Docente"
        title="Revisar barreras"
        description="Diagnóstico completo — barreras detectadas, severidad y dimensión afectada. Ninguna adaptación se genera todavía."
      />
      <RevisarStep />
    </div>
  )
}
