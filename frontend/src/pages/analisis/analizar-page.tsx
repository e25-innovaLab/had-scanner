import { useCallback, useState } from 'react';
import {
  AnalysisChecklist,
  type AnalysisChecklistSummary,
  type AnalysisUiStatus,
} from '@/components/aula/analysis-checklist';
import { AnalysisFlowFooter } from '@/components/aula/analysis-flow-footer';
import { StepHeader } from '@/components/aula/step-header';

export function AnalizarPage() {
  const [status, setStatus] = useState<AnalysisUiStatus>('analyzing');
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const onStatusChange = useCallback((summary: AnalysisChecklistSummary) => {
    setStatus(summary.status);
    setDoneCount(summary.doneCount);
    setTotalCount(summary.totalCount);
  }, []);

  const nextDisabled = status !== 'ready' && status !== 'incomplete';
  const nextLabel =
    status === 'incomplete' && doneCount > 0 && totalCount > 0
      ? `Continuar con ${doneCount} de ${totalCount} →`
      : 'Siguiente: Revisar';
  const nextHint =
    status === 'analyzing'
      ? 'Esperá a que el análisis termine para continuar.'
      : status === 'failed'
        ? 'El análisis falló. Reintentá o volvé a Cargar.'
        : status === 'incomplete'
          ? 'Podés continuar con las dimensiones analizadas; el informe marcará las que faltan.'
          : null;

  return (
    <>
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
        nextLabel={nextLabel}
        nextDisabled={nextDisabled}
        nextHint={nextHint}
      />
    </>
  );
}
