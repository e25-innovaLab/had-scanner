import { HomeHistories } from '@/components/aula/home-histories';
import { HomeStart } from '@/components/aula/home-start';
import { TutorialDialog } from '@/components/aula/tutorial-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FLOW_STEPS } from '@/lib/aula';
import { useBackendHealth } from '@/lib/api/use-backend-health';

export function HomePage() {
  const {
    backendUp,
    connectionFilled,
    connectionSegments,
  } = useBackendHealth();

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="space-y-2">
        <h1 className="font-heading text-[32px] leading-normal font-bold text-[#0F172A]">
          Hola, docente
        </h1>
        <p className="max-w-2xl text-[14px] leading-normal font-medium text-muted-foreground">
          Este es tu punto de entrada: iniciá un análisis nuevo para revisar y
          adaptar tu material.
        </p>
      </header>

      <div className="flex w-full flex-col gap-6">
        <HomeStart
          backendUp={backendUp}
          connectionFilled={connectionFilled}
          connectionSegments={connectionSegments}
        />

        <HomeHistories backendReady={backendUp} />

        <Card className="border-primary/25 bg-tertiary-container shadow-none">
          <CardHeader className="gap-2">
            <CardTitle className="text-base">Estás usando VERA sin cuenta</CardTitle>
            <CardDescription className="text-sm leading-6 text-foreground/80">
              Los materiales subidos y los PDF adaptados se guardan en el
              servidor y aparecen en el historial de esta página. El progreso del
              análisis en curso vive en esta sesión del navegador.
            </CardDescription>
            <p className="text-sm leading-6 text-muted-foreground">
              Próximamente vas a poder ingresar con una cuenta para asociar el
              historial a tu usuario.
            </p>
          </CardHeader>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>¿Cómo funciona?</CardTitle>
            <CardDescription>
              Un recorrido con revisión docente antes de aplicar cualquier cambio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="flex flex-wrap items-center gap-2">
              {FLOW_STEPS.map((step, index) => (
                <li key={step.href} className="flex items-center gap-2">
                  <span
                    className={
                      index === FLOW_STEPS.length - 1
                        ? 'inline-flex items-center rounded-[8px] border border-[rgba(132,204,22,0.45)] bg-primary/20 px-[10px] py-[4px] text-xs font-medium text-foreground shadow-[0_2px_6px_0_rgba(132,204,22,0.06)] backdrop-blur-[4px]'
                        : 'inline-flex items-center rounded-[8px] border border-[rgba(132,204,22,0.35)] bg-white/85 px-[10px] py-[4px] text-xs font-medium text-foreground shadow-[0_2px_6px_0_rgba(132,204,22,0.06)] backdrop-blur-[4px]'
                    }
                  >
                    {step.label}
                  </span>
                  {index < FLOW_STEPS.length - 1 ? (
                    <span className="text-muted-foreground" aria-hidden="true">
                      →
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
            <TutorialDialog />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
