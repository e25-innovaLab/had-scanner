"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function IaFab() {
  return (
    <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      <Dialog>
        <DialogTrigger
          render={
            <Button
              aria-label="Abrir asistente IA"
              className="size-12 rounded-full text-xs font-semibold shadow-md"
            />
          }
        >
          IA
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asistente IA</DialogTitle>
            <DialogDescription>
              La IA propone adaptaciones para las barreras del material. Ningún
              cambio se aplica solo: vos aceptás, editás o descartás.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
            <li>Cada barrera tiene 5 intentos de IA propios.</li>
            <li>Editar a mano o restaurar la propuesta no consume intentos.</li>
            <li>Si un intento falla, no se descuenta.</li>
          </ul>
          <Button
            variant="outline"
            className="h-10"
            nativeButton={false}
            render={<Link href="/analisis/cargar" />}
          >
            Iniciar un análisis
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
