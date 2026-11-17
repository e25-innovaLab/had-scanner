import { StepHeader } from '@/components/aula/step-header';
import { ResultadoStep } from '@/pages/analisis/resultado-step';

export function ResultadoPage() {
  return (
    <>
      <StepHeader
        step="05"
        actor="Sistema"
        title="Obtener resultado"
        description="Material adaptado + informe final de barreras y cambios aplicados. El original permanece intacto."
      />
      <ResultadoStep />
    </>
  );
}
