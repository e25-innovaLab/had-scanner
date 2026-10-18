import { FLOW_STEPS } from '@/lib/aula';

const ANALYSIS_KEY = 'aula-analysis-id';
const RESUME_KEY = 'aula-flow-resume';

export type FlowResume = {
  analysisId: string;
  path: string;
  updatedAt: string;
};

const FLOW_PATHS: Set<string> = new Set(
  FLOW_STEPS.map((step) => step.href as string)
);

export function withAnalysisId(
  href: string,
  analysisId: string | null | undefined
): string {
  if (!analysisId) return href;
  const [path, query = ''] = href.split('?');
  const params = new URLSearchParams(query);
  params.set('analysisId', analysisId);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function readStoredAnalysisId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      sessionStorage.getItem(ANALYSIS_KEY) ??
      readFlowResume()?.analysisId ??
      null
    );
  } catch {
    return null;
  }
}

export function storeAnalysisId(analysisId: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ANALYSIS_KEY, analysisId);
    const current = readFlowResume();
    writeFlowResume(
      analysisId,
      current?.path && FLOW_PATHS.has(current.path)
        ? current.path
        : '/analisis/analizar'
    );
  } catch {
    // ignore
  }
}

export function clearStoredAnalysisId() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ANALYSIS_KEY);
  } catch {
    // ignore
  }
}

export function resolveAnalysisId(
  fromQuery: string | null | undefined
): string | null {
  if (fromQuery) {
    storeAnalysisId(fromQuery);
    return fromQuery;
  }
  return readStoredAnalysisId();
}

export function readFlowResume(): FlowResume | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FlowResume;
    if (!parsed?.analysisId || !parsed?.path || !FLOW_PATHS.has(parsed.path)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeFlowResume(analysisId: string, path: string) {
  if (typeof window === 'undefined') return;
  const cleanPath = path.split('?')[0];
  if (!FLOW_PATHS.has(cleanPath)) return;
  try {
    const payload: FlowResume = {
      analysisId,
      path: cleanPath,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(RESUME_KEY, JSON.stringify(payload));
    sessionStorage.setItem(ANALYSIS_KEY, analysisId);
  } catch {
    // ignore
  }
}

export function clearFlowResume() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RESUME_KEY);
    clearStoredAnalysisId();
  } catch {
    // ignore
  }
}

export function resumeStepLabel(path: string): string {
  return FLOW_STEPS.find((step) => step.href === path)?.label ?? 'análisis';
}
