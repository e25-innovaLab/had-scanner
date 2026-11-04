import type {
  Analysis,
  AnalysisStatusResponse,
  ApiBarrier,
  BarriersResponse,
  ExportFile,
  Proposal,
  MaterialListResponse,
  Material,
  BackendAnalysis,
  BackendProposal,
} from "@/lib/api/types";
import { toBarriersResponse, toFlatBarriers } from "./mappers/backend-analysis";
import { toCreateProposalResult } from "./mappers/backend-proposal";
import { isBackendId } from "./ids";
import {
  saveCachedProposal,
  getCachedProposal,
  clearCachedProposal,
  applyCachedProposals,
} from "./proposal-cache";

const DEFAULT_BASE = "";

function baseUrl() {
  const env = import.meta.env.VITE_API_BASE_URL;
  if (typeof env === "string" && env.length > 0) {
    return env.replace(/\/$/, "");
  }
  return DEFAULT_BASE;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    let message = `Error HTTP ${res.status}`;
    if (data && typeof data === "object") {
      if ("detail" in data) {
        const detail = (data as { detail: unknown }).detail;
        if (typeof detail === "string") {
          message = detail;
        } else if (
          detail &&
          typeof detail === "object" &&
          "message" in detail &&
          typeof (detail as { message: unknown }).message === "string"
        ) {
          message = (detail as { message: string }).message;
        }
      } else if (
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
      ) {
        message = (data as { error: string }).error;
      }
    }
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export const api = {
  createAnalysis(input: {
    fileName: string;
    fileSize: number;
  }): Promise<Analysis> {
    return request<Analysis>("/api/analyses", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getStatus(analysisId: string): Promise<AnalysisStatusResponse> {
    return request<AnalysisStatusResponse>(
      `/api/analyses/${encodeURIComponent(analysisId)}/status`,
    );
  },

  getAnalysis(analysisId: string): Promise<Analysis> {
    return request<Analysis>(`/api/analyses/${encodeURIComponent(analysisId)}`);
  },

  listBarriers(analysisId: string): Promise<BarriersResponse> {
    return request<BarriersResponse>(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers`,
    );
  },

  listBarriersFlat(analysisId: string): Promise<{ barriers: ApiBarrier[] }> {
    return request<{ barriers: ApiBarrier[] }>(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers?flat=1`,
    );
  },

  getBarrier(analysisId: string, barrierId: string): Promise<ApiBarrier> {
    return request<ApiBarrier>(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}`,
    );
  },

  async createProposal(
    analysisId: string,
    barrierId: string,
    body?: { variant?: keyof ApiBarrier["variants"] },
  ): Promise<{ barrier: ApiBarrier; proposal: Proposal }> {
    if (isBackendId(analysisId)) {
      // El BE no tiene variants todavía; se ignora body.variant
      const raw = await request<BackendProposal>(
        `/barriers/${encodeURIComponent(barrierId)}/proposals`,
        { method: "POST", body: JSON.stringify({}) },
      );

      const { barriers } = await this.getBarriersFlatForUi(analysisId);
      const barrier = barriers.find((b) => b.id === barrierId);
      if (!barrier) {
        throw new Error("Barrera no encontrada tras generar la propuesta.");
      }
      const result = toCreateProposalResult(analysisId, barrier, raw);
      saveCachedProposal(analysisId, barrierId, {
        proposalId: result.proposal.id,
        text: result.proposal.text,
        original: result.barrier.original,
      });
      return result;
    }

    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/proposals`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
    );
  },

  async saveDraft(
    analysisId: string,
    barrierId: string,
    draft: string,
  ): Promise<ApiBarrier> {
    if (isBackendId(analysisId)) {
      const cached = getCachedProposal(analysisId, barrierId);
      if (cached) {
        saveCachedProposal(analysisId, barrierId, { ...cached, text: draft });
      }
      const { barriers } = await this.getBarriersFlatForUi(analysisId);
      const barrier = barriers.find((b) => b.id === barrierId);
      if (!barrier) throw new Error("Barrera no encontrada.");
      return { ...barrier, draft, hasProposal: Boolean(draft.trim()) };
    }
    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/draft`,
      {
        method: "PUT",
        body: JSON.stringify({ draft }),
      },
    );
  },

  async accept(
    analysisId: string,
    barrierId: string,
    draft?: string,
  ): Promise<ApiBarrier> {
    if (isBackendId(analysisId)) {
      const cached = getCachedProposal(analysisId, barrierId);
      if (!cached?.proposalId) {
        throw new Error(
          "No hay propuesta para aceptar. Generá una con IA primero.",
        );
      }
      await request(
        `/adaptations/${encodeURIComponent(cached.proposalId)}/accept`,
        { method: "POST", body: JSON.stringify({}) },
      );
      clearCachedProposal(analysisId, barrierId);
      const { barriers } = await this.getBarriersFlatForUi(analysisId);
      const barrier = barriers.find((b) => b.id === barrierId);
      if (!barrier) throw new Error("Barrera no encontrada.");
      return {
        ...barrier,
        status: "accepted",
        draft: draft ?? barrier.draft,
        hasProposal: true,
        currentProposal: draft ?? barrier.currentProposal,
        currentProposalId: null,
      };
    }
    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/accept`,
      {
        method: "POST",
        body: JSON.stringify({ draft }),
      },
    );
  },

  async discard(analysisId: string, barrierId: string): Promise<ApiBarrier> {
    if (isBackendId(analysisId)) {
      const cached = getCachedProposal(analysisId, barrierId);
      if (!cached?.proposalId) {
        throw new Error(
          "No hay propuesta para descartar. Generá una con IA primero.",
        );
      }
      await request(
        `/adaptations/${encodeURIComponent(cached.proposalId)}/reject`,
        { method: "POST", body: JSON.stringify({}) },
      );
      clearCachedProposal(analysisId, barrierId);
      const { barriers } = await this.getBarriersFlatForUi(analysisId);
      const barrier = barriers.find((b) => b.id === barrierId);
      if (!barrier) throw new Error("Barrera no encontrada.");
      return {
        ...barrier,
        status: "discarded",
        currentProposalId: null,
      };
    }
    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/discard`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  async reopen(analysisId: string, barrierId: string): Promise<ApiBarrier> {
    if (isBackendId(analysisId)) {
      const { barriers } = await this.getBarriersFlatForUi(analysisId);
      const barrier = barriers.find((b) => b.id === barrierId);
      if (!barrier) throw new Error("Barrera no encontrada.");
      return { ...barrier, status: "pending" };
    }
    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/reopen`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  export(analysisId: string): Promise<{
    exportStatus: string;
    exports: ExportFile[];
  }> {
    return request(`/api/analyses/${encodeURIComponent(analysisId)}/export`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  getExports(analysisId: string): Promise<{
    exportStatus: string;
    exports: ExportFile[];
    appliedChanges: string[];
    discardedChanges: string[];
    summary: { accepted: number; discarded: number; total: number };
  }> {
    return request(`/api/analyses/${encodeURIComponent(analysisId)}/exports`);
  },

  uploadMaterial(file: File): Promise<Material> {
    const form = new FormData();
    form.append("file", file);
    return request<Material>("/materials", {
      method: "POST",
      body: form,
    });
  },

  listMaterials(): Promise<MaterialListResponse> {
    return request<MaterialListResponse>("/materials");
  },

  async isBackendHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl()}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2500),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  analyzeMaterial(materialId: number): Promise<BackendAnalysis> {
    return request<BackendAnalysis>(`/materials/${materialId}/analysis`, {
      method: "POST",
    });
  },

  getBackendAnalysis(analysisId: number): Promise<BackendAnalysis> {
    return request<BackendAnalysis>(`/analysis/${analysisId}`);
  },

  async getBarriersForUi(analysisId: string): Promise<BarriersResponse> {
    if (isBackendId(analysisId)) {
      const analysis = await this.getBackendAnalysis(Number(analysisId));

      if (analysis.status === "processing") {
        throw new Error(
          "El análisis aún está en curso. Volvé cuando esté listo.",
        );
      }
      if (analysis.status === "failed") {
        throw new Error(
          analysis.error_message ??
            "El análisis falló y no hay barreras para revisar.",
        );
      }

      return toBarriersResponse(analysis);
    }
    return this.listBarriers(analysisId);
  },

  async getBarriersFlatForUi(
    analysisId: string,
  ): Promise<{ barriers: ApiBarrier[] }> {
    if (isBackendId(analysisId)) {
      const analysis = await this.getBackendAnalysis(Number(analysisId));

      if (analysis.status === "processing") {
        throw new Error(
          "El análisis aún está en curso. Volvé cuando esté listo.",
        );
      }
      if (analysis.status === "failed") {
        throw new Error(
          analysis.error_message ??
            "El análisis falló y no hay barreras para adaptar.",
        );
      }

      return {
        barriers: applyCachedProposals(analysisId, toFlatBarriers(analysis)),
      };
    }
    return this.listBarriersFlat(analysisId);
  },
};
