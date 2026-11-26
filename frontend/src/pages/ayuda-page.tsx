import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button-variants';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FLOW_STEPS } from '@/lib/aula';
import { cn } from '@/lib/utils';

const HELP = [
  'Subí un PDF (máx. 50 MB) o pegá texto (se convierte a PDF en el servidor).',
  'El sistema revisa solo las 6 dimensiones. No hace falta intervenir.',
  'Leé el diagnóstico: barreras, severidad y dónde aparecen. Todavía no hay adaptación.',
  'Pedí una propuesta solo en las barreras que elijas. Aceptá, editá o descartá.',
  'Ajustá el texto, pedí otra versión o seguí a mano si se agotan los intentos.',
  'Descargá el material adaptado y el informe. El original queda intacto.',
];

export function AyudaPage() {
  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <h1 className="font-heading text-[32px] leading-normal font-bold text-[#0F172A]">
          Ayuda
        </h1>
        <p className="max-w-2xl text-[14px] leading-normal font-medium text-muted-foreground">
          VERA acompaña la revisión de accesibilidad. La IA propone; el cambio
          se aplica recién cuando lo aceptás.
        </p>
      </header>
      <div className="space-y-3">
        {FLOW_STEPS.map((step, index) => (
          <Card key={step.href}>
            <CardHeader>
              <CardTitle className="font-heading font-bold text-[#0F172A]">
                {String(index + 1).padStart(2, '0')} · {step.label}
              </CardTitle>
              <CardDescription>{HELP[index]}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Link
        to="/analisis/cargar"
        className={cn(
          buttonVariants({ size: 'lg' }),
          'rounded-[12px] font-semibold'
        )}
      >
        Comenzar un análisis
      </Link>
    </div>
  );
}
