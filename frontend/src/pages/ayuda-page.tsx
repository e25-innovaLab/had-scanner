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
  'Subí un PDF, Word, PowerPoint (máx. 50 MB) o pegá el texto del material.',
  'El sistema revisa solo las 6 dimensiones. No hace falta intervenir.',
  'Leé el diagnóstico: barreras, severidad y dónde aparecen. Todavía no hay adaptación.',
  'Pedí una propuesta solo en las barreras que elijas. Aceptá, editá o descartá.',
  'Ajustá el texto, pedí otra versión o seguí a mano si se agotan los intentos.',
  'Descargá el material adaptado y el informe. El original queda intacto.',
];

export function AyudaPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Ayuda
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
          VERA acompaña la revisión de accesibilidad. La IA propone; el cambio
          se aplica recién cuando lo aceptás.
        </p>
      </header>
      <div className="space-y-3">
        {FLOW_STEPS.map((step, index) => (
          <Card key={step.href}>
            <CardHeader>
              <CardTitle>
                {String(index + 1).padStart(2, '0')} · {step.label}
              </CardTitle>
              <CardDescription>{HELP[index]}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Link
        to="/analisis/cargar"
        className={cn(buttonVariants({ size: 'lg' }), 'h-10 px-4')}
      >
        Comenzar un análisis
      </Link>
    </div>
  );
}
