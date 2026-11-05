'use client';

import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function IaFab() {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '/acceso') return null;

  return (
    <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      <Dialog>
        <DialogTrigger
          render={
            <Button
              aria-label="Abrir asistente IA"
              className="relative size-12 rounded-full bg-ink text-xs font-semibold text-sidebar-primary-foreground shadow-md hover:bg-ink/90"
            />
          }
        >
          IA
          <span className="ia-fab-orbit pointer-events-none absolute inset-0" aria-hidden="true">
            <span className="ia-fab-dot absolute top-1 right-1 size-2 rounded-full bg-primary" />
          </span>
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
            className="h-10 rounded-xl"
            nativeButton={false}
            render={<Link to="/analisis/cargar" />}
          >
            Iniciar un análisis
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
