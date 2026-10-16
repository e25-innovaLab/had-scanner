import { Suspense } from "react"
import type { Metadata } from "next"
import { DetailEditor } from "@/components/aula/detail-editor"
import { AI_ATTEMPTS_PER_BARRIER } from "@/lib/aula"

export const metadata: Metadata = {
  title: "Detalle y edición",
}

export default function DetallePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando edición...</p>}>
      <DetailEditor initialRemaining={AI_ATTEMPTS_PER_BARRIER} />
    </Suspense>
  )
}
