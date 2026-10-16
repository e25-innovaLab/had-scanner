import type { Metadata } from "next"
import { Suspense } from "react"
import { ResultadoStep } from "@/app/(flujo)/analisis/resultado/resultado-step"
import { StepHeader } from "@/components/aula/step-header"

export const metadata: Metadata = {
  title: "Obtener resultado",
}

export default function ResultadoPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <StepHeader
        step="06"
        actor="Sistema"
        title="Obtener resultado"
        description="Material adaptado + informe final de barreras y cambios aplicados. El original permanece intacto."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando...</p>}>
        <ResultadoStep />
      </Suspense>
    </div>
  )
}
