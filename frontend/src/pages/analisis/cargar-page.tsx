import { StepHeader } from '@/components/aula/step-header';
import { CargarStep } from '@/pages/analisis/cargar-step';

export function CargarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <StepHeader
        step="01"
        actor="Docente"
        title="Cargar material"
        description="El docente sube el material educativo. Punto de entrada único al flujo."
      />
      <CargarStep />
    </div>
  );
}
