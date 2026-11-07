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
import { usePendingProposalJobs } from '@/lib/api/proposal-jobs';
import { withAnalysisId } from '@/lib/api/url';
import { cn } from '@/lib/utils';

export function IaFab() {
  const { pathname } = useLocation();
  const pendingJobs = usePendingProposalJobs();
  const activeJob = pendingJobs[0] ?? null;

  if (pathname === '/' || pathname === '/acceso') return null;

  const isGenerating = Boolean(activeJob);
  const detailHref =
    activeJob &&
    withAnalysisId(
      `/analisis/detalle?origen=ia&desde=generar&barrera=${encodeURIComponent(activeJob.barrierId)}${
        activeJob.dimensionId
          ? `&dimension=${encodeURIComponent(activeJob.dimensionId)}`
          : ''
      }`,
      activeJob.analysisId
    );

  return (
    <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      <Dialog>
        <DialogTrigger
          render={
            <Button
              aria-label={
                isGenerating
                  ? activeJob.barrierTitle
                    ? `Generando propuesta para ${activeJob.barrierTitle}`
                    : 'Generando propuesta con IA'
                  : 'Abrir asistente IA'
              }
              aria-busy={isGenerating}
              className={cn(
                'relative size-12 rounded-full bg-ink text-xs font-semibold text-sidebar-primary-foreground shadow-md hover:bg-ink/90',
                isGenerating && 'ia-fab-busy ring-2 ring-primary/70'
              )}
            />
          }
        >
          IA
          <span
            className={cn(
              'ia-fab-orbit pointer-events-none absolute inset-0',
              isGenerating && 'ia-fab-orbit-busy'
            )}
            aria-hidden="true"
          >
            <span
              className={cn(
                'ia-fab-dot absolute top-1 right-1 size-2 rounded-full bg-primary',
                isGenerating && 'ia-fab-dot-busy'
              )}
            />
          </span>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isGenerating ? 'Generando propuesta' : 'Asistente IA'}
            </DialogTitle>
            <DialogDescription>
              {isGenerating
                ? activeJob.barrierTitle
                  ? `La IA está preparando una adaptación para “${activeJob.barrierTitle}”. Podés seguir navegando; te avisamos acá.`
                  : 'La IA está preparando una adaptación. Podés seguir navegando; te avisamos acá.'
                : 'La IA propone adaptaciones para las barreras del material. Ningún cambio se aplica solo: vos aceptás, editás o descartás.'}
            </DialogDescription>
          </DialogHeader>
          {isGenerating ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                Cuando termine, la propuesta queda en el detalle de la barrera.
              </p>
              {detailHref ? (
                <Button
                  variant="outline"
                  className="h-10 rounded-xl"
                  nativeButton={false}
                  render={<Link to={detailHref} />}
                >
                  Ir al detalle
                </Button>
              ) : null}
            </div>
          ) : (
            <>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
