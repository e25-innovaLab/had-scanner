import { useCallback, useState } from 'react';
import {
  AnalysisChecklist,
  type AnalysisUiStatus,
} from '@/components/aula/analysis-checklist';
import { AnalysisFlowFooter } from '@/components/aula/analysis-flow-footer';
import { StepHeader } from '@/components/aula/step-header';

export function AnalizarPage() {
  const [status, setStatus] = useState<AnalysisUiStatus>('analyzing');

  const onStatusChange = useCallback((next: AnalysisUiStatus) => {
    setStatus(next);
  }, []);

  const nextDisabled = status !== 'ready';
  const nextHint =
    status === 'analyzing'
      ? 'Esperá a que el análisis termine para continuar.'
      : status === 'failed'
        ? 'El análisis falló. Reintentá o volvé a Cargar.'
        : null;

  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <StepHeader
        step="02"
        actor="Sistema · IA"
        title="Analizar material"
        description="El sistema escanea el material según las 6 dimensiones de accesibilidad. Proceso automático, sin intervención del docente."
      />
      <AnalysisChecklist onStatusChange={onStatusChange} />
      <AnalysisFlowFooter
        backHref="/analisis/cargar"
        nextHref="/analisis/revisar"
        nextLabel="Siguiente: Revisar"
        nextDisabled={nextDisabled}
        nextHint={nextHint}
      />
    </div>
  );
}
