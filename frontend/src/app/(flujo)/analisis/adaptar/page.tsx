import type { Metadata } from "next"
import { Suspense } from "react"
import { AdaptarStep } from "@/app/(flujo)/analisis/adaptar/adaptar-step"
import { StepHeader } from "@/components/aula/step-header"

export const metadata: Metadata = {
  title: "Adaptar con IA",
}

export default function AdaptarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <StepHeader
        step="04"
        actor="Docente + IA"
        title="Adaptar con IA"
        description="Elegí en qué barreras usar la IA: cada propuesta se genera cuando la pedís y usa 1 de los 5 intentos de esa barrera. Vos aceptás, editás o descartás — nunca se aplica sola."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando...</p>}>
        <AdaptarStep />
      </Suspense>
    </div>
  )
}
