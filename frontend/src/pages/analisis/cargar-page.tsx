import { StepHeader } from '@/components/aula/step-header';
import { CargarStep } from '@/pages/analisis/cargar-step';

export function CargarPage() {
  return (
    <>
      <StepHeader
        step="01"
        actor="Docente"
        title="Cargar material"
        description="El docente sube el material educativo. Punto de entrada único al flujo."
      />
      <CargarStep />
    </>
  );
}
