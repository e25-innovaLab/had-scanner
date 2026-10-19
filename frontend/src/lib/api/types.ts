export type AnalysisStatus = 'uploaded' | 'analyzing' | 'ready' | 'failed';

export type DimensionProgressStatus = 'pending' | 'running' | 'done' | 'error';

export type BarrierDecision = 'pending' | 'accepted' | 'discarded';

export type Severity = 'alta' | 'media' | 'baja' | 'ninguna';

export type DimensionProgress = {
  id: string;
  label: string;
  status: DimensionProgressStatus;
};

export type Analysis = {
  id: string;
  status: AnalysisStatus;
  originalFileName: string;
  originalFileSize: number;
  createdAt: string;
  analyzingStartedAt: string | null;
  dimensionProgress: DimensionProgress[];
  exportStatus: 'idle' | 'queued' | 'generating' | 'ready';
  exports: ExportFile[];
};

export type ExportFile = {
  name: string;
  detail: string;
};

export type ApiBarrier = {
  id: string;
  analysisId: string;
  dimensionId: string;
  dimension: string;
  severity: Exclude<Severity, 'ninguna'>;
  title: string;
  why: string;
  where: string;
  recommendation: string;
  status: BarrierDecision;
  remainingAttempts: number;
  hasProposal: boolean;
  draft: string | null;
  currentProposal: string | null;
  criterion: string;
  detected: string;
  original: string;
  location: string;
  proposes: string;
  variants: {
    simple: string;
    breve: string;
    pasos: string;
    ejemplo: string;
    otra: string;
  };
};

export type Proposal = {
  id: string;
  analysisId: string;
  barrierId: string;
  kind: 'initial_variant' | 'manual' | 'regenerated';
  text: string;
  isCurrent: boolean;
  createdAt: string;
};

export type BarrierGroupDto = {
  id: string;
  name: string;
  count: number;
  severity: Severity;
  items: {
    id: string;
    title: string;
    why: string;
    where: string;
    recommendation: string;
    status: BarrierDecision;
  }[];
};

export type BarriersResponse = {
  groups: BarrierGroupDto[];
  stats: {
    total: number;
    highSeverity: number;
    dimensionsAffected: number;
    dimensionsTotal: number;
  };
};

export type AnalysisStatusResponse = {
  id: string;
  status: AnalysisStatus;
  originalFileName: string;
  originalFileSize: number;
  dimensionProgress: DimensionProgress[];
};

export type DbShape = {
  analyses: Analysis[];
  barriers: ApiBarrier[];
  proposals: Proposal[];
};

export type Material = {
  id: number;
  name: string;
  status: string;
};

export type MaterialListResponse = {
  materials: Material[];
  total: number;
};
