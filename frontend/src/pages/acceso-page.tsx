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
    <div className="vera-landing-bg flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[968px] flex-1 flex-col px-4 py-8 sm:px-6 md:py-10">
      <div className="mb-5">
        <VeraLogo to="/" compact size="lg" />
      </div>

      <header className="mb-8 max-w-2xl space-y-2.5">
        <h1 className="font-heading text-[32px] leading-normal font-bold text-[#0F172A]">
          ¿Cómo querés ingresar?
        </h1>
        <p className="text-[14px] leading-normal font-medium text-muted-foreground">
          VERA usa inteligencia artificial para detectar barreras de
          accesibilidad en materiales educativos y proponerte adaptaciones.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="flex flex-1 flex-col items-start gap-5 rounded-[24px] border-2 border-[rgba(226,232,240,0.90)] bg-white/88 p-8 backdrop-blur-[8px]">
          <CardHeader className="w-full gap-3 p-0">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-info-foreground">
              <span className="size-1.5 rounded-full bg-info-foreground" />
              Disponible
            </span>
            <CardTitle className="font-heading text-[22px] font-bold text-[#0F172A]">
              Ingresar sin cuenta
            </CardTitle>
            <CardDescription className="text-[14px] leading-normal font-medium">
              Ideal para un análisis puntual, sin registro. Podés recorrer todo
              el flujo y retomar materiales desde el historial.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex w-full flex-1 flex-col justify-between gap-6 p-0">
            <ul className="space-y-3 text-[14px] leading-normal font-medium text-foreground">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-vera-mark-lime" />
                Analizar y adaptar materiales
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-vera-mark-lime" />
                Descargar informes y material adaptado
              </li>
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <Clock className="mt-0.5 size-4 shrink-0" />
                Historial en el servidor (compartido hasta que haya cuentas)
              </li>
            </ul>
            <Button
              type="button"
              size="lg"
              className="w-full text-sm font-semibold"
              onClick={enterWithoutAccount}
            >
              Ingresar sin cuenta →
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-1 flex-col items-start gap-5 rounded-[24px] border-2 border-[rgba(226,232,240,0.90)] bg-white/88 p-8 backdrop-blur-[8px]">
          <CardHeader className="w-full gap-3 p-0">
            <span className="inline-flex w-fit items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
              Próximamente
            </span>
            <CardTitle className="font-heading text-[22px] font-bold text-[#0F172A]">
              Ingresar con mi cuenta
            </CardTitle>
            <CardDescription className="text-[14px] leading-normal font-medium">
              Estará disponible en una versión futura para asociar el historial
              a tu usuario y retomarlo entre dispositivos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex w-full flex-1 flex-col justify-between gap-6 p-0">
            <ul className="space-y-3 text-[14px] leading-normal font-medium text-muted-foreground">
              <li>• Historial propio, no compartido</li>
              <li>• Retomar trabajos pendientes</li>
              <li>• Preferencias guardadas</li>
            </ul>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled
            >
              Iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 rounded-[20px] border-2 border-[rgba(226,232,240,0.90)] border-l-4 border-l-primary bg-white/88 px-8 py-6 backdrop-blur-[8px]">
        <CardHeader className="gap-2 p-0">
          <CardTitle className="font-heading text-base font-bold text-[#0F172A]">
            Antes de empezar
          </CardTitle>
          <CardDescription className="text-[14px] leading-normal font-medium">
            El contenido se envía a un servicio externo de IA para el análisis.
            Los materiales y PDF adaptados se guardan en el servidor (historial)
            con retención limitada. No incluyas datos personales de estudiantes.
          </CardDescription>
          <Dialog>
            <DialogTrigger
              render={
                <button
                  type="button"
                  className="justify-self-start rounded-md text-left text-sm font-medium text-foreground underline-offset-2 transition-opacity hover:underline active:opacity-70"
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
                  Los materiales subidos y los PDF adaptados se guardan en el
                  servidor y aparecen en el historial. Podés ocultarlos desde la
                  app; la retención automática o una limpieza en Supabase los
                  elimina después. El progreso de un análisis en curso vive en
                  esta sesión del navegador. Sin cuenta, el historial es
                  compartido entre quienes usan este entorno.
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
    </div>
  );
}
