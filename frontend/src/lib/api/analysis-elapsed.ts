const STORAGE_KEY = "aula-analysis-elapsed";

type ElapsedRecord = {
  startedAt: number;
  endedAt?: number;
};

function readAll(): Record<string, ElapsedRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, ElapsedRecord>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, ElapsedRecord>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function ensureAnalysisStartedAt(analysisId: string): number {
  const all = readAll();
  const existing = all[analysisId];
  if (existing?.startedAt) return existing.startedAt;
  const startedAt = Date.now();
  all[analysisId] = { startedAt };
  writeAll(all);
  return startedAt;
}

export function readAnalysisEndedAt(analysisId: string): number | null {
  const endedAt = readAll()[analysisId]?.endedAt;
  return typeof endedAt === "number" ? endedAt : null;
}

export function markAnalysisEnded(analysisId: string, endedAt = Date.now()) {
  const all = readAll();
  const current = all[analysisId] ?? { startedAt: endedAt };
  if (current.endedAt != null) return;
  all[analysisId] = { ...current, endedAt };
  writeAll(all);
}

export function elapsedSecondsForAnalysis(analysisId: string): number {
  const startedAt = ensureAnalysisStartedAt(analysisId);
  const endedAt = readAnalysisEndedAt(analysisId) ?? Date.now();
  return Math.max(0, Math.floor((endedAt - startedAt) / 1000));
}
