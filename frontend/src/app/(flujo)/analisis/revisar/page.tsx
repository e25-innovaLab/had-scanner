import type { Metadata } from "next"
import { Suspense } from "react"
import { RevisarStep } from "@/app/(flujo)/analisis/revisar/revisar-step"
import { StepHeader } from "@/components/aula/step-header"

export const metadata: Metadata = {
  title: "Revisar barreras",
}

export default function RevisarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <StepHeader
        step="03"
        actor="Docente"
        title="Revisar barreras"
        description="Diagnóstico completo — barreras detectadas, severidad y dimensión afectada. Ninguna adaptación se genera todavía."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando...</p>}>
        <RevisarStep />
      </Suspense>
    </div>
  )
}
