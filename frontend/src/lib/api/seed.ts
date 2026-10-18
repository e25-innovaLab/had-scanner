import {
  AI_ATTEMPTS_PER_BARRIER,
  BARRIERS,
  DETAIL_BARRIERS,
  DIMENSIONS,
} from '@/lib/aula';
import type { ApiBarrier, DimensionProgress } from '@/lib/api/types';

const DIMENSION_IDS = [
  'comprension',
  'estructura',
  'visual',
  'representacion',
  'multimedia',
  'navegacion',
] as const;

export function initialDimensionProgress(): DimensionProgress[] {
  return DIMENSION_IDS.map((id, index) => ({
    id,
    label: DIMENSIONS[index] ?? id,
    status: 'pending' as const,
  }));
}

/** Clona el catálogo mock de `aula.ts` como barreras de un análisis. */
export function seedBarriersForAnalysis(analysisId: string): ApiBarrier[] {
  const detailById = new Map(
    DETAIL_BARRIERS.map((item) => [item.barrierId, item])
  );

  return BARRIERS.filter((group) => group.items.length > 0).flatMap((group) =>
    group.items.map((item, index) => {
      const id = `${group.id}-${index}`;
      const detail = detailById.get(id);
      const severity =
        group.severity === 'ninguna' ? ('baja' as const) : group.severity;
      const aiProposal =
        detail?.aiProposal ??
        `Propuesta: ${item.recommendation.charAt(0).toUpperCase()}${item.recommendation.slice(1)}`;

      return {
        id,
        analysisId,
        dimensionId: group.id,
        dimension: group.name,
        severity,
        title: item.title,
        why: item.why,
        where: item.where,
        recommendation: item.recommendation,
        status: 'pending' as const,
        remainingAttempts: AI_ATTEMPTS_PER_BARRIER,
        hasProposal: false,
        draft: null,
        currentProposal: null,
        criterion: detail?.criterion ?? group.name,
        detected: detail?.detected ?? item.why,
        original: detail?.original ?? `(Fragmento en ${item.where})`,
        location: detail?.location ?? item.where,
        proposes: detail?.proposes ?? item.recommendation,
        variants: detail?.variants ?? {
          simple: aiProposal,
          breve: item.recommendation,
          pasos: `1. Revisar ${item.where}.\n2. ${item.recommendation}`,
          ejemplo: aiProposal,
          otra: aiProposal,
        },
      };
    })
  );
}

/** Texto canónico de propuesta “IA” para una barrera (seed). */
export function seedProposalText(barrier: ApiBarrier): string {
  return (
    barrier.variants.simple ||
    `Propuesta: ${barrier.recommendation.charAt(0).toUpperCase()}${barrier.recommendation.slice(1)}`
  );
}
