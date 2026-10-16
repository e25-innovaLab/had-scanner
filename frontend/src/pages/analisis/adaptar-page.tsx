import { StepHeader } from "@/components/aula/step-header"
import { AdaptarStep } from "@/pages/analisis/adaptar-step"

export function AdaptarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <StepHeader
        step="04"
        actor="Docente + IA"
        title="Adaptar con IA"
        description="Elegí en qué barreras usar la IA: cada propuesta se genera cuando la pedís y usa 1 de los 5 intentos de esa barrera. Vos aceptás, editás o descartás — nunca se aplica sola."
      />
      <AdaptarStep />
    </div>
  )
}
