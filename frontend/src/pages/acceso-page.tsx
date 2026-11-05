import { Check, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VeraLogo } from "@/components/shell/vera-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { startGuestSession } from "@/lib/api/guest-session";

export function AccesoPage() {
  const navigate = useNavigate();

  function enterWithoutAccount() {
    startGuestSession();
    navigate("/inicio");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <div className="mb-10">
        <VeraLogo to="/" compact />
      </div>

      <header className="mb-8 max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          ¿Cómo querés ingresar?
        </h1>
        <p className="text-sm leading-6 text-muted-foreground sm:text-[15px]">
          VERA usa inteligencia artificial para detectar barreras de
          accesibilidad en materiales educativos y proponerte adaptaciones.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/80 shadow-sm ring-1 ring-border/60">
          <CardHeader className="gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
              <span className="size-1.5 rounded-full bg-primary-foreground" />
              Disponible
            </span>
            <CardTitle className="text-xl">Ingresar sin cuenta</CardTitle>
            <CardDescription className="text-sm leading-6">
              Ideal para un análisis puntual, sin registro. Podés recorrer todo
              el flujo ahora.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success-foreground" />
                Analizar y adaptar materiales
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success-foreground" />
                Descargar informes y material adaptado
              </li>
              <li className="flex gap-2 text-muted-foreground">
                <Clock className="mt-0.5 size-4 shrink-0" />
                El trabajo no se guarda al cerrar la sesión
              </li>
            </ul>
            <Button
              type="button"
              size="lg"
              className="h-11 w-full rounded-xl px-4 text-sm font-semibold"
              onClick={enterWithoutAccount}
            >
              Ingresar sin cuenta →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 opacity-95 shadow-sm">
          <CardHeader className="gap-3">
            <span className="inline-flex w-fit items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Próximamente
            </span>
            <CardTitle className="text-xl text-muted-foreground">
              Ingresar con mi cuenta
            </CardTitle>
            <CardDescription className="text-sm leading-6">
              Estará disponible en una versión futura para guardar tu trabajo y
              retomarlo después.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Historial de análisis</li>
              <li>• Retomar trabajos pendientes</li>
              <li>• Preferencias guardadas</li>
            </ul>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full rounded-xl px-4"
              disabled
            >
              Iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/80 border-l-4 border-l-primary shadow-sm ring-1 ring-border/60">
        <CardHeader className="gap-2">
          <CardTitle className="text-base">Antes de empezar</CardTitle>
          <CardDescription className="text-sm leading-6">
            El contenido se envía a un servicio externo de IA para el análisis.
            Los archivos se eliminan después del procesamiento. No incluyas
            datos personales de estudiantes.
          </CardDescription>
          <Dialog>
            <DialogTrigger
              render={
                <button
                  type="button"
                  className="justify-self-start text-left text-sm font-medium text-foreground underline-offset-2 hover:underline"
                />
              }
            >
              Más información sobre privacidad →
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Privacidad en VERA</DialogTitle>
                <DialogDescription>
                  Cómo tratamos el material que subís al analizar con IA.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  VERA envía el contenido del material a un proveedor externo de
                  inteligencia artificial (p. ej. Gemini) solo para detectar
                  barreras y proponer adaptaciones.
                </p>
                <p>
                  Los archivos subidos se usan para el análisis y se eliminan
                  después del procesamiento. En el modo sin cuenta, el trabajo
                  no se guarda en la nube ni entre dispositivos: vive en esta
                  sesión del navegador.
                </p>
                <p>
                  No incluyas datos personales de estudiantes ni información
                  sensible en el material. Si el documento los tiene, redactalos
                  antes de subirlo.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>
    </div>
  );
}
