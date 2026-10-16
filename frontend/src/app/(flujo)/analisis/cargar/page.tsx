import type { Metadata } from "next"
import { Suspense } from "react"
import { CargarStep } from "@/app/(flujo)/analisis/cargar/cargar-step"
import { StepHeader } from "@/components/aula/step-header"

export const metadata: Metadata = {
  title: "Cargar material",
}

export default function CargarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <StepHeader
        step="01"
        actor="Docente"
        title="Cargar material"
        description="El docente sube el material educativo. Punto de entrada único al flujo."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando...</p>}>
        <CargarStep />
      </Suspense>
    </div>
  )
}
