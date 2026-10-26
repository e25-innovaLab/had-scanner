import { StepHeader } from '@/components/aula/step-header';
import { AdaptarStep } from '@/pages/analisis/adaptar-step';

export function AdaptarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <StepHeader
        step="04"
        actor="Docente + IA"
        title="Adaptar con IA"
        description="Se detectaron barreras. Revisalas una a una: pedí una propuesta a la IA, escribí tu versión o descartala. Cada barrera tiene sus propios intentos de IA."
      />
      <AdaptarStep />
    </div>
  );
}
