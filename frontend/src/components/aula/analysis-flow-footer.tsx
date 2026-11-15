'use client';

import { useSearchParams } from 'react-router-dom';
import { FlowFooter } from '@/components/aula/flow-footer';
import { resolveAnalysisId, withAnalysisId } from '@/lib/api/url';

export function AnalysisFlowFooter({
  backHref,
  backLabel,
  nextHref,
  nextLabel,
  nextDisabled = false,
  nextHint,
}: {
  backHref: string;
  backLabel?: string;
  nextHref: string;
  nextLabel: string;
  nextDisabled?: boolean;
  nextHint?: string | null;
}) {
  const [searchParams] = useSearchParams();
  const analysisId = resolveAnalysisId(searchParams.get('analysisId'));

  return (
    <FlowFooter
      backHref={withAnalysisId(backHref, analysisId)}
      backLabel={backLabel}
      nextHref={withAnalysisId(nextHref, analysisId)}
      nextLabel={nextLabel}
      nextDisabled={nextDisabled}
      nextHint={nextHint}
    />
  );
}
