"use client"

import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FLOW_STEPS } from "@/lib/aula"

export function TutorialDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="h-10 px-4" />}>
        Ver tutorial
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cómo funciona</DialogTitle>
          <DialogDescription>
            Un recorrido con revisión docente antes de aplicar cualquier cambio.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {FLOW_STEPS.map((step, index) => (
            <li key={step.href} className="flex gap-3 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-info text-xs font-medium text-info-foreground">
                {index + 1}
              </span>
              <span className="pt-0.5">
                <Link to={step.href} className="font-medium hover:underline">
                  {step.label}
                </Link>
              </span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
