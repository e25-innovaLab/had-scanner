import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export function FlowFooter({
  backHref,
  backLabel = "Atrás",
  nextHref,
  nextLabel,
}: {
  backHref: string
  backLabel?: string
  nextHref: string
  nextLabel: string
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Link
        to={backHref}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 px-4")}
      >
        {backLabel}
      </Link>
      <Link
        to={nextHref}
        className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}
      >
        {nextLabel}
      </Link>
    </div>
  )
}
