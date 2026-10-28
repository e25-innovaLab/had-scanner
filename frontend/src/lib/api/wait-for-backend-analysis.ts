import { api } from "@/lib/api/client";
import type { BackendAnalysis } from "@/lib/api/types";

export async function waitForBackendAnalysis(
  analysisId: number,
  opts?: {
    intervalMs?: number;
    onStep?: (a: BackendAnalysis) => void;
  },
): Promise<BackendAnalysis> {
  const interval = opts?.intervalMs ?? 1000;

  for (;;) {
    const a = await api.getBackendAnalysis(analysisId);
    opts?.onStep?.(a);

    if (a.status === "completed" || a.status === "failed") {
      return a;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}