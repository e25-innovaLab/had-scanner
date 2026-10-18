/// <reference types="node" />
import { randomUUID } from 'node:crypto';
import {
  initialDimensionProgress,
  seedBarriersForAnalysis,
  seedProposalText,
} from '@/lib/api/seed';
import { readDb, updateDb } from '@/lib/api/store';
import type {
  Analysis,
  AnalysisStatusResponse,
  ApiBarrier,
  BarriersResponse,
  ExportFile,
  Proposal,
} from '@/lib/api/types';
import { BARRIERS, RESULT_FILES } from '@/lib/aula';

const ANALYZE_STEP_MS = 700;

function notFound(message: string) {
  return Response.json({ error: message }, { status: 404 });
}

export async function createAnalysis(input: {
  fileName: string;
  fileSize: number;
}): Promise<Analysis> {
  const now = new Date().toISOString();
  const analysis: Analysis = {
    id: randomUUID(),
    status: 'analyzing',
    originalFileName: input.fileName,
    originalFileSize: input.fileSize,
    createdAt: now,
    analyzingStartedAt: now,
    dimensionProgress: initialDimensionProgress(),
    exportStatus: 'idle',
    exports: [],
  };
  const barriers = seedBarriersForAnalysis(analysis.id);

  return updateDb((db) => {
    db.analyses.push(analysis);
    db.barriers.push(...barriers);
    return analysis;
  });
}

function advanceProgress(analysis: Analysis): Analysis {
  if (analysis.status === 'ready' || analysis.status === 'failed') {
    return analysis;
  }
  if (!analysis.analyzingStartedAt) {
    analysis.analyzingStartedAt = analysis.createdAt;
  }
  const elapsed = Date.now() - new Date(analysis.analyzingStartedAt).getTime();
  const doneCount = Math.min(
    analysis.dimensionProgress.length,
    Math.floor(elapsed / ANALYZE_STEP_MS)
  );

  analysis.dimensionProgress = analysis.dimensionProgress.map((row, index) => {
    if (index < doneCount) return { ...row, status: 'done' };
    if (index === doneCount) return { ...row, status: 'running' };
    return { ...row, status: 'pending' };
  });

  if (doneCount >= analysis.dimensionProgress.length) {
    analysis.status = 'ready';
    analysis.dimensionProgress = analysis.dimensionProgress.map((row) => ({
      ...row,
      status: 'done',
    }));
  } else {
    analysis.status = 'analyzing';
  }

  return analysis;
}

export async function getAnalysisStatus(
  id: string
): Promise<AnalysisStatusResponse | Response> {
  const db = await readDb();
  const stored = db.analyses.find((item) => item.id === id);
  if (!stored) return notFound('Análisis no encontrado');

  // Progreso derivado del reloj: no hace falta escribir en cada poll.
  const view = structuredClone(stored);
  const wasReady = stored.status === 'ready';
  advanceProgress(view);

  // Persistir solo al pasar a ready (un write, no uno cada 700ms).
  if (view.status === 'ready' && !wasReady) {
    await updateDb((current) => {
      const analysis = current.analyses.find((item) => item.id === id);
      if (analysis) advanceProgress(analysis);
    });
  }

  return {
    id: view.id,
    status: view.status,
    originalFileName: view.originalFileName,
    originalFileSize: view.originalFileSize,
    dimensionProgress: view.dimensionProgress,
  };
}

export async function getAnalysis(id: string): Promise<Analysis | Response> {
  const db = await readDb();
  const analysis = db.analyses.find((item) => item.id === id);
  if (!analysis) return notFound('Análisis no encontrado');
  return analysis;
}

function buildGroups(barriers: ApiBarrier[]): BarriersResponse {
  const byDimension = new Map(barriers.map((b) => [b.id, b]));
  const groups = BARRIERS.map((template) => {
    const items = template.items.map((item, index) => {
      const id = `${template.id}-${index}`;
      const barrier = byDimension.get(id);
      return {
        id,
        title: barrier?.title ?? item.title,
        why: barrier?.why ?? item.why,
        where: barrier?.where ?? item.where,
        recommendation: barrier?.recommendation ?? item.recommendation,
        status: barrier?.status ?? ('pending' as const),
      };
    });
    return {
      id: template.id,
      name: template.name,
      count: items.length,
      severity: template.severity,
      items,
    };
  });

  const listed = barriers;
  const highSeverity = listed.filter((b) => b.severity === 'alta').length;
  const dimensionsAffected = new Set(listed.map((b) => b.dimensionId)).size;

  return {
    groups,
    stats: {
      total: listed.length,
      highSeverity,
      dimensionsAffected,
      dimensionsTotal: BARRIERS.length,
    },
  };
}

export async function listBarriers(
  analysisId: string
): Promise<BarriersResponse | Response> {
  const db = await readDb();
  const analysis = db.analyses.find((item) => item.id === analysisId);
  if (!analysis) return notFound('Análisis no encontrado');
  const barriers = db.barriers.filter((b) => b.analysisId === analysisId);
  return buildGroups(barriers);
}

export async function getBarrier(
  analysisId: string,
  barrierId: string
): Promise<ApiBarrier | Response> {
  const db = await readDb();
  const barrier = db.barriers.find(
    (item) => item.analysisId === analysisId && item.id === barrierId
  );
  if (!barrier) return notFound('Barrera no encontrada');
  return barrier;
}

export async function listBarriersFlat(
  analysisId: string
): Promise<ApiBarrier[] | Response> {
  const db = await readDb();
  const analysis = db.analyses.find((item) => item.id === analysisId);
  if (!analysis) return notFound('Análisis no encontrado');
  return db.barriers.filter((b) => b.analysisId === analysisId);
}

export async function createProposal(
  analysisId: string,
  barrierId: string,
  options?: { variant?: keyof ApiBarrier['variants'] }
): Promise<{ barrier: ApiBarrier; proposal: Proposal } | Response> {
  return updateDb((db) => {
    const barrier = db.barriers.find(
      (item) => item.analysisId === analysisId && item.id === barrierId
    );
    if (!barrier) return notFound('Barrera no encontrada');
    if (barrier.remainingAttempts <= 0) {
      return Response.json(
        { error: 'No quedan intentos de IA para esta barrera.' },
        { status: 409 }
      );
    }

    const text = options?.variant
      ? barrier.variants[options.variant]
      : seedProposalText(barrier);

    db.proposals.forEach((p) => {
      if (p.barrierId === barrierId && p.analysisId === analysisId) {
        p.isCurrent = false;
      }
    });

    const proposal: Proposal = {
      id: randomUUID(),
      analysisId,
      barrierId,
      kind: barrier.hasProposal ? 'regenerated' : 'initial_variant',
      text,
      isCurrent: true,
      createdAt: new Date().toISOString(),
    };
    db.proposals.push(proposal);

    barrier.remainingAttempts = Math.max(0, barrier.remainingAttempts - 1);
    barrier.hasProposal = true;
    barrier.currentProposal = text;
    barrier.draft = text;
    barrier.status = 'pending';

    return { barrier, proposal };
  });
}

export async function saveDraft(
  analysisId: string,
  barrierId: string,
  draft: string
): Promise<ApiBarrier | Response> {
  return updateDb((db) => {
    const barrier = db.barriers.find(
      (item) => item.analysisId === analysisId && item.id === barrierId
    );
    if (!barrier) return notFound('Barrera no encontrada');
    barrier.draft = draft;
    if (draft.trim()) {
      barrier.hasProposal = true;
    }
    return barrier;
  });
}

export async function setBarrierStatus(
  analysisId: string,
  barrierId: string,
  status: 'accepted' | 'discarded' | 'pending',
  draft?: string
): Promise<ApiBarrier | Response> {
  return updateDb((db) => {
    const barrier = db.barriers.find(
      (item) => item.analysisId === analysisId && item.id === barrierId
    );
    if (!barrier) return notFound('Barrera no encontrada');
    barrier.status = status;
    if (draft !== undefined) {
      barrier.draft = draft;
      if (draft.trim()) barrier.hasProposal = true;
    }
    if (status === 'pending') {
      // reopen: deja editar de nuevo; no borra la propuesta
    }
    return barrier;
  });
}

export async function startExport(
  analysisId: string
): Promise<
  { exportStatus: Analysis['exportStatus']; exports: ExportFile[] } | Response
> {
  return updateDb((db) => {
    const analysis = db.analyses.find((item) => item.id === analysisId);
    if (!analysis) return notFound('Análisis no encontrado');

    const accepted = db.barriers.filter(
      (b) => b.analysisId === analysisId && b.status === 'accepted'
    );
    const baseName =
      analysis.originalFileName.replace(/\.[^.]+$/, '') || 'material';

    analysis.exportStatus = 'ready';
    analysis.exports = [
      {
        name: `${baseName}_adaptado.pdf`,
        detail: `Material con ${accepted.length} adaptaciones aceptadas · simulado`,
      },
      {
        name: 'Informe_barreras.pdf',
        detail: 'Diagnóstico completo y registro de cambios · simulado',
      },
      {
        name: `${baseName}_adaptado.docx`,
        detail: 'Versión editable del material adaptado · simulado',
      },
    ];
    // fallback to RESULT_FILES naming if empty somehow
    if (analysis.exports.length === 0) {
      analysis.exports = RESULT_FILES.map((f) => ({
        name: f.name,
        detail: f.detail,
      }));
    }

    return {
      exportStatus: analysis.exportStatus,
      exports: analysis.exports,
    };
  });
}

export async function getExports(analysisId: string): Promise<
  | {
      exportStatus: Analysis['exportStatus'];
      exports: ExportFile[];
      appliedChanges: string[];
      summary: { accepted: number; discarded: number };
    }
  | Response
> {
  const db = await readDb();
  const analysis = db.analyses.find((item) => item.id === analysisId);
  if (!analysis) return notFound('Análisis no encontrado');

  const accepted = db.barriers.filter(
    (b) => b.analysisId === analysisId && b.status === 'accepted'
  );
  const discarded = db.barriers.filter(
    (b) => b.analysisId === analysisId && b.status === 'discarded'
  );

  return {
    exportStatus: analysis.exportStatus,
    exports: analysis.exports,
    appliedChanges: accepted.map((b) => `${b.dimension} — ${b.title}`),
    summary: {
      accepted: accepted.length,
      discarded: discarded.length,
    },
  };
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}
