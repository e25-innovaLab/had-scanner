import { Info } from 'lucide-react';
import { HomeStart } from '@/components/aula/home-start';
import { TutorialDialog } from '@/components/aula/tutorial-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function HomePage() {
  return (
    <div className="space-y-4">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Hola, docente
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
          Este es tu punto de entrada: iniciá un análisis nuevo o retomá el
          último en este navegador.
        </p>
      </header>

      <HomeStart />

      <Card className="bg-info text-info-foreground ring-info-foreground/10">
        <CardHeader className="grid-cols-[auto_1fr] items-start gap-x-3">
          <span className="grid size-6 place-items-center rounded-full bg-white/70 text-info-foreground">
            <Info className="size-3.5" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <CardTitle>Estás usando VERA sin cuenta</CardTitle>
            <CardDescription className="text-info-foreground/80">
              En este navegador podés continuar el último análisis (paso + id).
              El detalle del trabajo lo guarda la API; no hay historial en la
              nube ni en otros dispositivos. Antes de salir, descargá el
              material desde &quot;Obtener resultado&quot; si ya terminaste.
            </CardDescription>
            <p className="text-sm leading-6 text-info-foreground/80">
              Próximamente vas a poder ingresar con una cuenta para guardar tu
              historial y retomar trabajos anteriores.
            </p>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>¿Cómo funciona?</CardTitle>
          <CardDescription>
            Cargar → Analizar → Revisar → Adaptar → Detalle y Edición → Obtener
            resultado. Un recorrido de 6 pasos, con revisión docente antes de
            aplicar cualquier cambio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TutorialDialog />
        </CardContent>
      </Card>
    </div>
  );
}
