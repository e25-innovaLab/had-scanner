'use client';

import { useCallback, useState } from 'react';
import { AdaptBoard, type AdaptCounts } from '@/components/aula/adapt-board';
import { AnalysisFlowFooter } from '@/components/aula/analysis-flow-footer';

const EMPTY_COUNTS: AdaptCounts = {
  accepted: 0,
  discarded: 0,
  pending: 0,
  total: 0,
  nextPending: null,
};

function detalleHrefForPending(counts: AdaptCounts): string {
  const next = counts.nextPending;
  if (!next) return '/analisis/detalle';
  return `/analisis/detalle?origen=ia&barrera=${encodeURIComponent(next.id)}&dimension=${encodeURIComponent(next.dimensionId)}&i=${next.index}&n=${counts.total}`;
}

export function AdaptarStep() {
  const [counts, setCounts] = useState<AdaptCounts>(EMPTY_COUNTS);

  const onCountsChange = useCallback((next: AdaptCounts) => {
    setCounts(next);
  }, []);

  const allResolved = counts.total > 0 && counts.pending === 0;
  const reviewed = counts.accepted + counts.discarded;
  const nextIndex = counts.nextPending?.index ?? Math.min(reviewed + 1, Math.max(counts.total, 1));

  return (
    <>
      <AdaptBoard onCountsChange={onCountsChange} />
      <AnalysisFlowFooter
        backHref="/analisis/revisar"
        nextHref={
          allResolved ? '/analisis/resultado' : detalleHrefForPending(counts)
        }
        nextLabel={
          allResolved
            ? 'Siguiente: Obtener resultado'
            : reviewed === 0
              ? `Comenzar revisión (1 de ${counts.total || '…'}) →`
              : `Continuar revisión (${nextIndex} de ${counts.total}) →`
        }
      />
    </>
  );
}
