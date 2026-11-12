import { StepHeader } from '@/components/aula/step-header';
import { AdaptarStep } from '@/pages/analisis/adaptar-step';

export function AdaptarPage() {
  return (
    <>
      <StepHeader
        step="04"
        actor="Docente"
        title="Adaptar con IA"
        description="Barreras agrupadas por dimensión. Elegí una dimensión, revisá sus barreras y pedí propuestas a la IA cuando lo necesites."
      />
      <AdaptarStep />
    </>
  );
}
