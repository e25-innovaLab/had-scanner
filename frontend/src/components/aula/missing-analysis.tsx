import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export function MissingAnalysis({ step }: { step: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm leading-6">
      <p className="font-medium">Falta un análisis activo</p>
      <p className="mt-1 text-muted-foreground">
        Para {step}, primero cargá un material. El flujo usa{" "}
        <code className="text-xs">analysisId</code> en la URL (API simulada).
      </p>
      <Link
        to="/analisis/cargar"
        className={cn(buttonVariants({ size: "lg" }), "mt-4 inline-flex h-10 px-4")}
      >
        Ir a Cargar
      </Link>
    </div>
  )
}
