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

export function HomePage() {
  return (
    <div className="space-y-5">
      <header className="mb-2 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Hola, docente
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
          Este es tu punto de entrada: iniciá un análisis nuevo para revisar y
          adaptar tu material.
        </p>
      </header>

      <HomeStart />

      <Card className="border-transparent bg-tertiary-container shadow-none ring-1 ring-primary/20">
        <CardHeader className="gap-2">
          <CardTitle className="text-base">Estás usando VERA sin cuenta</CardTitle>
          <CardDescription className="text-sm leading-6 text-foreground/80">
            El trabajo solo se conserva en esta sesión del navegador. No hay
            historial en la nube ni en otros dispositivos. Antes de salir,
            descargá el material desde &quot;Obtener resultado&quot; si ya
            terminaste.
          </CardDescription>
          <p className="text-sm leading-6 text-muted-foreground">
            Próximamente vas a poder ingresar con una cuenta para guardar tu
            historial y retomar trabajos anteriores.
          </p>
        </CardHeader>
      </Card>

      <Card className="shadow-sm ring-1 ring-border/70">
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
                      ? 'rounded-full border border-primary bg-primary/20 px-3 py-1 text-xs font-medium text-foreground'
                      : 'rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground'
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
  );
}
